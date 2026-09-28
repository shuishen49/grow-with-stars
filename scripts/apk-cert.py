"""读出 APK 的签名证书指纹，用来判断两次打包是不是同一把钥匙。
v2/v3 签名没有 META-INF/CERT.RSA，只能解析 APK Signing Block。
"""
import hashlib
import struct
import sys

MAGIC = b'APK Sig Block 42'
V2 = 0x7109871A
V3 = 0xF05368C0


def u32(b, p):
    return struct.unpack_from('<I', b, p)[0]


def u64(b, p):
    return struct.unpack_from('<Q', b, p)[0]


def find_eocd(data):
    idx = data.rfind(b'PK\x05\x06')
    return idx


def signing_block(data):
    eocd = find_eocd(data)
    cd_off = u32(data, eocd + 16)
    assert data[cd_off - 16:cd_off] == MAGIC, '不是标准的 APK Signing Block'
    size = u64(data, cd_off - 24)  # = pairs 长度 + 8(B) + 16(magic)
    start = cd_off - 8 - size  # A 字段的位置
    return data[start + 8:cd_off - 24]  # 只要 pairs 区


def pairs(block):
    p = 0
    while p + 8 <= len(block):
        ln = u64(block, p)
        if ln < 8 or p + ln > len(block):
            break
        # 注意：pair 是 (uint64 长度, uint32 ID, 内容)，ID 只有 4 字节
        pid = u32(block, p + 8)
        yield pid, block[p + 12:p + ln]
        p += ln


def certs_from_signer(seq):
    """v2/v3 块的内容 = [u64: signers 序列长度][signer...]，每个 signer 也是 u64 长度前缀"""
    out = []
    p = 0
    total = u64(seq, p)
    p += 8
    end = min(p + total, len(seq))
    while p + 8 <= end:
        ln = u64(seq, p)
        if ln < 8 or p + 8 + ln > end:
            break
        signer = seq[p + 8:p + 8 + ln]
        p += 8 + ln
        out.extend(certs_from_signed_data(signer))
    return out


def certs_from_signed_data(signer):
    # signer 第一个字段是 u64 长度的 signed data
    p = 0
    ln = u64(signer, p)
    signed = signer[p + 8:p + 8 + ln]
    # signed data: digests 序列, certificates 序列, additional attrs
    q = 0
    dlen = u64(signed, q)
    q += 8 + dlen
    clen = u64(signed, q)
    q += 8
    out = []
    end = q + clen
    while q + 4 <= end:
        n = u32(signed, q)
        q += 4
        cert = signed[q:q + n]
        q += n
        out.append(hashlib.sha256(cert).hexdigest()[:16])
    return out


def main(path):
    data = open(path, 'rb').read()
    block = signing_block(data)
    found = False
    for pid, blob in pairs(block):
        if pid in (V2, V3):
            name = 'v2' if pid == V2 else 'v3'
            cs = certs_from_signer(blob)
            print(f'{path}  {name} 证书: {cs}')
            found = True
    if not found:
        print(path, '没找到 v2/v3 签名块')


for f in sys.argv[1:]:
    try:
        main(f)
    except Exception as e:
        print(f, '解析失败:', e)

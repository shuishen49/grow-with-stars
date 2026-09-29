/** @type {import('tailwindcss').Config} */

// 平板 UI 设计令牌（来自 tablet-ui-kit/tokens.json）
// 涨红跌绿：pos=玫红(加分/正分)  neg=薄荷深绿(扣分/负分)
// posdeep/negdeep 是同色系加深版，专门用于小号文字（≥4.5:1）；大号数字用 pos/neg 即可
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 平板断点：≥1100 走左右双栏（素材包建议布局），768–1099 单栏 + 收窄导航
      screens: {
        tb: '1100px',
      },
      colors: {
        canvas: '#F8F6F0', // 奶油白画布
        ink: '#202B49', // 正文近黑（带一点蓝）
        mut: '#6F7D96', // 次要文字
        line: '#E8EAF4', // 发丝边框
        brand: {
          DEFAULT: '#7052F5', // 主色紫
          dark: '#5738E8',
          soft: '#F0EBFF',
        },
        pos: '#EE3566', // 加分/正分（玫红）
        posdeep: '#D01F52',
        neg: '#07886D', // 扣分/负分（薄荷深绿）
        negdeep: '#067763',
        rosy: '#FFF0F5', // 玫红浅底
        mint: '#E9FBF3', // 薄荷浅底
        peach: '#FFF3DD', // 杏黄浅底
        gold: '#F3B735', // 星星金
        golddeep: '#9C6B00', // 金色小字（浅底上可读）
      },
      boxShadow: {
        card: '0 4px 16px rgba(67,49,111,.05)',
        pop: '0 16px 40px rgba(67,49,111,.16)',
        drag: '0 24px 56px rgba(67,49,111,.28)',
      },
      borderRadius: {
        card: '20px',
        ctl: '12px',
      },
    },
  },
  plugins: [],
}

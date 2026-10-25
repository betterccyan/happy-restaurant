// 首次启动的示例数据：让 App 一打开就能点菜
// 二级分类：早餐分饮品/餐点，午晚餐分主食/菜品，加餐不分
export const SEED_CATEGORIES = [
  { name: '早餐', subs: ['饮品', '餐点'] },
  { name: '中晚餐', subs: ['主食', '菜品'] },
  { name: '加餐', subs: [] }
]

export const SEED_DISHES = [
  {
    name: '番茄炒蛋',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🍅',
    description: '酸甜下饭，永远的神',
    calories: 180,
    ingredients: '番茄 2 个\n鸡蛋 3 个\n小葱 1 根',
    options: []
  },
  {
    name: '宫保鸡丁',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🍗',
    description: '微辣带甜，花生要脆',
    calories: 420,
    ingredients: '鸡腿肉 300 克\n花生米 50 克\n干辣椒 5 个\n黄瓜 半根',
    options: [
      {
        name: '辣度',
        multi: false,
        required: true,
        choices: [
          { label: '不辣', price: 0 },
          { label: '微辣', price: 0 },
          { label: '中辣', price: 0 },
          { label: '特辣', price: 0 }
        ]
      },
      {
        name: '加料',
        multi: true,
        required: false,
        choices: [
          { label: '加花生', price: 0 },
          { label: '加黄瓜', price: 0 }
        ]
      }
    ]
  },
  {
    name: '青椒土豆丝',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🥔',
    description: '脆爽，米饭杀手',
    calories: 210,
    ingredients: '土豆 2 个\n青椒 1 个\n醋 少许',
    options: [
      {
        name: '口感',
        multi: false,
        required: true,
        choices: [
          { label: '脆一点', price: 0 },
          { label: '软一点', price: 0 }
        ]
      }
    ]
  },
  {
    name: '红烧排骨',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🍖',
    description: '慢炖一小时，肉离骨',
    calories: 520,
    ingredients: '猪肋排 500 克\n冰糖 20 克\n生抽 2 勺\n姜 3 片',
    options: []
  },
  {
    name: '清蒸鲈鱼',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🐟',
    description: '鲜，只用盐和葱姜',
    calories: 260,
    ingredients: '鲈鱼 1 条\n姜 4 片\n小葱 3 根\n蒸鱼豉油 2 勺',
    options: []
  },
  {
    name: '蒜蓉生菜',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🥬',
    description: '大火快炒三十秒',
    calories: 90,
    ingredients: '生菜 1 颗\n蒜 4 瓣',
    options: []
  },
  {
    name: '紫菜蛋花汤',
    category: '中晚餐',
    sub: '菜品',
    emoji: '🍲',
    description: '三分钟出锅',
    calories: 80,
    ingredients: '紫菜 1 小把\n鸡蛋 2 个\n虾皮 少许',
    options: []
  },
  {
    name: '米饭',
    category: '中晚餐',
    sub: '主食',
    emoji: '🍚',
    description: '一碗刚好',
    calories: 230,
    ingredients: '大米 1 杯',
    options: [
      {
        name: '分量',
        multi: false,
        required: true,
        choices: [
          { label: '小半碗', price: 0 },
          { label: '一碗', price: 0 },
          { label: '大碗', price: 0 }
        ]
      }
    ]
  },
  {
    name: '小笼包',
    category: '早餐',
    sub: '餐点',
    emoji: '🥟',
    description: '皮薄汁多，一屉六个',
    calories: 280,
    ingredients: '面粉 300 克\n猪肉馅 250 克',
    options: [
      {
        name: '数量',
        multi: false,
        required: true,
        choices: [
          { label: '半屉', price: 0 },
          { label: '一屉', price: 0 },
          { label: '两屉', price: 0 }
        ]
      }
    ]
  },
  {
    name: '燕麦粥',
    category: '早餐',
    sub: '餐点',
    emoji: '🥣',
    description: '暖胃，加蜂蜜更好',
    calories: 150,
    ingredients: '燕麦片 50 克\n牛奶 200 毫升',
    options: []
  },
  {
    name: '煎蛋',
    category: '早餐',
    sub: '餐点',
    emoji: '🍳',
    description: '边上要焦一点',
    calories: 120,
    ingredients: '鸡蛋 2 个',
    options: [
      {
        name: '熟度',
        multi: false,
        required: true,
        choices: [
          { label: '溏心', price: 0 },
          { label: '全熟', price: 0 },
          { label: '单面焦', price: 0 }
        ]
      }
    ]
  },
  {
    name: '豆浆',
    category: '早餐',
    sub: '饮品',
    emoji: '🥛',
    description: '现磨，不加糖',
    calories: 90,
    ingredients: '黄豆 80 克',
    options: []
  },
  {
    name: '水果拼盘',
    category: '加餐',
    sub: '',
    emoji: '🍉',
    description: '当季水果切一盘',
    calories: 110,
    ingredients: '苹果 1 个\n香蕉 2 根\n时令水果 若干',
    options: []
  },
  {
    name: '酸奶',
    category: '加餐',
    sub: '',
    emoji: '🥗',
    description: '冰箱里的那一盒',
    calories: 130,
    ingredients: '酸奶 1 盒',
    options: []
  }
]

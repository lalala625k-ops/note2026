export type CardType = 'image' | 'web' | 'text';

export interface Card {
  id: string;               // 唯一标识
  type: CardType;           // 类型
  x: number;                // X坐标
  y: number;                // Y坐标
  width: number;            // 宽度
  height: number;           // 高度
  zIndex: number;           // 层级
  groupId?: string | null;  // 所属组ID
  content?: string;         // 文本内容 / OCR全文
  title?: string;           // 网页标题 / 图片提取标题
  url?: string;             // 网页链接
  image?: string;           // 网页缩略图 / 图片卡片Base64或路径
  description?: string;     // 网页完整描述 (悬停展示)
  favicon?: string;         // 网站图标
  reminder?: string | null; // 标记日期与提醒时间 (如 "2026-06-26")
  tags?: string[];          // 卡片标签集合 (如 ["灵感", "待办"])
  isParsing?: boolean;      // 图片/网页元数据解析中状态 (显示旋转加载动效)
}

export interface Group {
  id: string;               // 唯一标识
  title: string;            // 父物体名称 / 容器标题
  x: number;                // X坐标
  y: number;                // Y坐标
  width: number;            // 宽度
  height: number;           // 高度
  color?: string;           // 容器强调色
  zIndex?: number;          // 层级 (默认为底板层级)
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

export interface HistoryState {
  cards: Card[];
  groups: Group[];
}

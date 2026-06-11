# Sample Data

示例数据用于前端开发、演示、测试和文档截图。所有数据均为虚构生成,不反映任何真实业务。

## 目录结构

```
data/
├── README.md          ← 本文件
├── sample/            ← 样本数据(只读,经 git 跟踪)
│   ├── sample-sales-2025.csv
│   └── sample-products.json
└── runtime/           ← 运行时数据(可写,不进 git,容器命名卷)
    └── visualizer.duckdb
```

## 文件清单

| 文件 | 类型 | 行数 / 条数 | 用途 |
|------|------|------------|------|
| `sample/sample-sales-2025.csv` | CSV | 200 行 (含表头 201 行) | 销售流水,用于时间序列/区域/品类/渠道分析 |
| `sample/sample-products.json` | JSON | 50 条 | 产品主数据,用于关联分析、库存视图 |
| `runtime/visualizer.duckdb` | DuckDB | (运行时生成) | 嵌入式分析数据库,持久化上传数据集与查询缓存 |

## sample/sample-sales-2025.csv

### 字段字典

| 字段 | 类型 | 说明 | 取值范围 / 示例 |
|------|------|------|-----------------|
| `date` | string (ISO 8601) | 销售日期 | `2025-01-03` ~ `2025-12-31` |
| `region` | string | 一线城市/区域 | 北京 / 上海 / 广州 / 深圳 / 成都 / 杭州 / 武汉 / 西安 |
| `category` | string | 商品品类 | 电子产品 / 家居 / 服装 / 食品 / 美妆 |
| `product` | string | 商品名称 | 每品类 5-8 个具体商品 |
| `channel` | string | 销售渠道 | 线上 / 线下 / 直播 / 私域 |
| `revenue` | number (2 dp) | 销售额(元) | 50.00 ~ 5000.00 |
| `quantity` | integer | 销售件数 | 1 ~ 50 |
| `customer_id` | string | 客户 ID | `C0001` ~ `C0500` |

### 字段相关性

- **`revenue` 与 `quantity`**: 高单价商品(智能手机 3299,床垫 3999)通常 quantity=1;低单价(坚果礼盒 288)常见 quantity=2-4。
- **`channel` 与 `category`**: 美妆类直播渠道占比高;家居类以线下渠道为主;电子产品线上渠道占比最高。
- **`date` 分布**: 12 个月均匀分布,2025-11/12 有明显季节性上涨(双 11/双 12/圣诞)。
- **`region` 销量差异**: 北京、上海、深圳为第一梯队,西安、武汉相对低 (但单店客单价不一定低)。

### 典型查询示例

```bash
# 11月日均销售额
awk -F, 'NR>1 && $1 ~ /^2025-11/' sample-sales-2025.csv | \
  awk -F, '{s+=$6; c++} END {print "avg:", s/c}'

# 各渠道销售总额
awk -F, 'NR>1 {c[$5]+=$6} END {for (k in c) print k, c[k]}' sample-sales-2025.csv
```

## sample-products.json

### 结构

```json
[
  {
    "id": "P001",
    "name": "智能手机 Pro Max",
    "category": "电子产品",
    "price": 3299.0,
    "stock": 120,
    "launched": "2024-09"
  }
]
```

### 字段字典

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 产品主键,`P001` ~ `P050` |
| `name` | string | 产品展示名 |
| `category` | string | 所属品类(5 选 1,与 sales 一致) |
| `price` | number (1 dp) | 标价(元) |
| `stock` | integer | 当前库存 |
| `launched` | string (YYYY-MM) | 上架月份 |

### 分类分布

每个 category 各 10 条产品,共 50 条。

## 数据生成方式

数据为**人工设计 + 随机扰动**生成,确保:

1. 字段分布真实 (区间、相关性、季节性)
2. 客户 ID 与销售额无强关联 (避免误读)
3. 文案脱敏 (无真实品牌名、真实客户信息)

如需更大规模数据(>10k 行)用于压测,请使用 [`scripts/gen-sales.mjs`](../../scripts/gen-sales.mjs) 重新生成。

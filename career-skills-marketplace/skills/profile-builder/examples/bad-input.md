# 示例：非简历输入 → 返回 error

## 场景

用户误粘贴了一段与求职完全无关的内容（照片描述）。

## 输入

```json
{
  "resume_text": "这是一张猫咪的照片，拍摄于北京朝阳公园，猫咪是橘色的，正在晒太阳，非常可爱。拍摄时间是 2024 年春天，相机型号 Sony A7C。"
}
```

## 输出

```json
{
  "skill": "profile-builder",
  "confidence": "insufficient",
  "error": {
    "type": "non_resume_input",
    "message": "输入内容不是简历或求职背景描述。请提供包含工作经历、教育背景或技能描述的文本。",
    "evidence": "检测到内容为图片描述（含「照片」「拍摄」「相机型号」等关键词），与求职场景无关联"
  },
  "evidence_count": 0,
  "missing_fields": []
}
```

## 说明

- `confidence: "insufficient"` 时不输出 `profile` 字段
- `error.type` 便于上游系统（如 career-principal）做路由判断
- `error.evidence` 说明判断依据，避免误判合理输入
- 不对输入内容进行任何画像提取尝试

## 边界说明

以下输入**不**应返回 error，应返回低置信度结果：

- 「我是做 IT 的」（虽然信息少，但与求职相关）
- 「从事教育行业 3 年，想转互联网」（有明确意图）

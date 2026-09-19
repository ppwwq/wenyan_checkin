# C 组题库交付核对

- 范围：essay-01、essay-09、essay-11 至 essay-16；保留现有题号与 memoryId。
- 新题 728，道路是逐词题、整段理解题、完整分析选项题，以及指定分析句的同类词语／关系辨析题。后者以独立术语作为选项，不替换整段句子，避免错误选项出现内部矛盾。完整书中分析保留在解析与 summary。
- 原通用 fallback 全部删除。168 项原 fallback 及 2 项综合分析均已单独编写完整选项。
- 来源节点登记 1,254 项：986 covered、2 disputed、266 excluded。包括 277 个 vocab 行、34 个 annot 块，所有表格行（含表头登记）及 text/note/band/pp/head 区块；缺项 0。
- disputed：论语「不违」与「固」的无条件唯一词义；相关限定解读及异说仍有理解题。青玉案「星」「玉壶」依书中主线限定，解析保留异说。
- excluded：表头、标题、导航、历史考查索引、作者人物背景、阅读程序／答题元说明、生活表达示范。每项在 coverage 内附具体理由。
- 主来源与跨篇关联来源共 768 条：anchor 均命中指定 PDF 物理页，printedPage 均与该页页脚相符，blockPath 全可解析。跨篇题补齐 essayIds、relatedSources 与各篇真实原文。
- 自动核验：所有题 4 个不同选项、ID 唯一、coverage 路径唯一、引用题号存在、无 U+FFFD、无通用 fallback；保留原有题库不直接写入 bank.json。
- 重建：运行 group-c-author.py；仅写 group-c.json。复核为代理按用户所附书逐项核对，不等同教师审核或官方真题认证。

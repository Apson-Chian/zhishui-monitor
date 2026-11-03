# 分支预览说明 · 液态玻璃（5.14.0）

`codex/liquid-glass` 为独立视觉分支。原版在 `main`（36137a8），当前正式服务器仍为下方记录的5.13.2版本。本次只推送分支，不进行服务器切换。静态资源中的版本号5.14.0用于本分支缓存标识，不代表正式发布已变更。

---

# 当前正式版 · 知识阅读列表与交互提示（5.13.2）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/knowledge
- 发布：20261103-reading-index-v42；目录/var/www/zhishui/releases/20261103-reading-index-v42。
- 备份：/var/backups/zhishui/20261103-reading-index-v42；前版20261103-context-cards-v41。
- 发布包 SHA-256：fd3dfcb1d4c6577c2f060792bd035fc788a7e8e47688a55d8a87e696ce93507a。
- 运行文件：171个。

当前发布 `20261103-reading-index-v42`（5.13.2）：水利知识改为紧凑的双列阅读列表，手机单列；移除重复插画与独立“阅读全文”栏，每篇使用覆盖整条的原生按钮打开文章。分类、搜索、数量反馈与空结果恢复保留，pH搜索忽略大小写。污染源标记支持鼠标和键盘打开释放信息，断面入口标明“地图定位”并将地图带入视野。无地图时移除无效定位入口，未载入时控件禁用；没有图像框的AI说明改为普通文章内容。指北针改为静态方向标识。

六种屏宽的交互与回退检查见qa/VERIFICATION.md。本机Chromium、WebKit、Firefox在390px视口复查整条打开、Enter/Escape、归还焦点、分类与搜索、源标记Space操作及断面定位通过，无页面脚本错误。截图qa/knowledge-chromium-390.png、qa/knowledge-webkit-390.png及qa/knowledge-firefox-390.png，其中WebKit版本已查看。正式HTTPS六种屏宽复查上述知识/地图/无地图/加载失败后重试/AI无框说明全部通过，无页面错误，不调用真实AI接口。

服务器安装器与公网171个运行文件的内容、类型和缓存逐项核验通过；规范跳转、缺失资源404、Nginx及既有站点健康正常。首次公网核验出现TLS握手超时，重试全部通过。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 操作说明与稳定卡片（5.13.1）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261103-context-cards-v41；目录/var/www/zhishui/releases/20261103-context-cards-v41。
- 备份：/var/backups/zhishui/20261103-context-cards-v41；前版20261103-monitor-workspace-v40。
- 发布包 SHA-256：344bce5a3dbb9955990a9407e6ddfd521c0a89bdc0af02e81e4ff8069e801df5。
- 运行文件：170个。

当前发布 `20261103-context-cards-v41`（5.13.1）：看水情每个工作区增加用途和操作说明，明确读数单位、教学阈值、推演时间和核查含义。地点对比、数据表改为独立页面；地点资料、读数解释、图层、推演规则、污染参数和模型、记录详情及图片来源改为弹出卡片，打开时保持主页面尺寸和滚动位置，关闭回到原按钮。查看说明自动暂停推演；对比切换地点后返回总览，水域、地图和读数保持一致。

本地功能、五种屏宽与三浏览器引擎验证见qa/VERIFICATION.md。正式HTTPS在1440/1024/768/390/320px复查通过：待字体加载完成后测量，卡片不改变主页面尺寸与滚动位置；图层、污染参数、独立对比/数据表、跨水域返回、说明暂停、事件详情、实验观察保存及AI图片来源正常，无页面脚本错误。安装器和公网170个运行文件的内容、类型、缓存逐项核验通过，规范跳转、缺失资源404、Nginx及既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 看水情统一工作区（5.13.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261103-monitor-workspace-v40；目录/var/www/zhishui/releases/20261103-monitor-workspace-v40。
- 备份：/var/backups/zhishui/20261103-monitor-workspace-v40；前版20261103-glass-controls-v39。
- 发布包 SHA-256：1e8ad5c4456aa6f2fe9cdd38491c81e984b3e4066336a403e07c1a6894146db3。

当前发布 `20261103-monitor-workspace-v40`（5.13.0）：看水情整理为水情总览、降雨推演、污染扩散、事件记录四个工作区。总览用水域/地点选择、地图与单一读数卡、变化趋势组织内容；降雨预设只设置参数，点击播放才推进时间。污染、水位与照片巡检记录统一分类、回溯及导出。手机先显示关键读数，卡片、按钮、图表与留白统一。

npm run check全部通过，新增check-monitor-flow.mjs验证四个独立工作区、预设仅准备参数、显式播放、切区暂停、湖泊及水域/地点一致性、合并记录、分类筛选与完整导出。原水文、污染模型、地图、AI与导航回归继续通过。

本地Chromium验证1440/1024/900/768/600/390/320px无横向溢出和重复ID；总览不混入降雨控件，地点选择/地图/读数/AI关联/趋势指标与跨地点对比一致；暂停更新会同步来源说明。降雨预设停在0分，播放后推进，1%闸门与湖泊无闸门、回放、从结果进入地图、切区暂停均正常。污染事件集中到记录页，500ms播放计时器在离开后清理；水位/巡检/污染统一筛选导出、刷新保留、处置/撤销、从记录恢复河段/1200kg/0.5mg/L/事件时刻、从通知弹窗回溯时关闭弹窗均通过。四项键盘切换、三种深链接、AI地点上下文通过，无页面脚本错误。

最终移动布局另在本机WebKit与Firefox验证读数先于地图、降雨播放、72%闸门、污染分析与记录恢复，无脚本错误。属于本机浏览器与移动视口验证，不称真机iOS验收。

截图qa/monitor-before-1440.png与qa/monitor-before-390.png用于现状对照；qa/monitor-map-1440.png、qa/monitor-rain-1440.png、qa/monitor-records-390.png及WebKit/Firefox手机首屏已检查。统一样式monitor-unified.css只作用于看水情；保持首页与其他栏目样式。

正式HTTPS浏览器在320/390/1440px验证通过：手机首屏关键读数可见，四个入口切换、显式播放、统一事件记录与参数回溯正常，无页面错误。最终手机布局在本机WebKit/Firefox复查通过。安装器与公网168个运行文件的内容、类型和缓存逐项核验通过；Nginx、规范跳转、缺失资源404及既有站点健康正常。报告见qa/server-deployment.json。最终首屏截图qa/monitor-final-320.png、qa/monitor-final-390.png、qa/monitor-final-1440.png。

---
历史发布记录：

# 当前正式版 · 参考视频的闸门圆钮与胶囊按钮（5.12.1）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261103-glass-controls-v39；目录/var/www/zhishui/releases/20261103-glass-controls-v39。
- 备份：/var/backups/zhishui/20261103-glass-controls-v39；前版20261103-pollution-gis-v38。
- 发布包 SHA-256：abb5239e4e3e38798f501fd5112654381a5e5e6de2cd0ad7c639686dd233f778。

当前发布 `20261103-glass-controls-v39`（5.12.1）：降雨推演雨强预设改为30/60/90/120mm/h四个胶囊按钮，选中为浅青绿底与描边。虚拟闸门滑块采用52px半透明圆钮、中央竖线与柔和阴影，轨道填充与百分比同步，开度可逐1%调整。键盘、触摸及历史回放沿用原生range。

参考用户3.3秒视频的圆形闸门滑块与胶囊选项，新增glass-controls.css，只调整降雨/闸门控件。采用CSS半透明渐变、背景模糊和独立清晰竖线；不声称真实折射。原生range透明交互层与装饰圆钮分离，无新增动画循环或依赖。活动轨道、圆钮位置、可读百分比与aria-valuetext由同一开度同步；回看旧时刻同步归位。原0—100范围改为1%步长；雨强新增120mm/h快捷项，原教学模型未改变。

全部npm run check通过。Chromium验证1440/1024/768/390/320px无横向溢出；0/31/62/72/100%位置误差小于1px；鼠标拖动、触摸点击、方向键1%调整、Home/End、历史回放及湖泊无闸门均正常。减少动态无缩放过渡；强制颜色切回可见原生滑块；无模糊效果时保留清晰圆钮回退。匹配驱动后，本机WebKit与Firefox的拖动、键盘与72%视觉复查通过，WebKit另验证触摸；没有页面脚本错误。属于本机浏览器引擎与移动视口模拟，未称真机iOS验收。

截图qa/glass-gate-390.png、qa/glass-rain-390.png、qa/glass-controls-1440.png、qa/glass-gate-320.png、qa/glass-gate-webkit.png与qa/glass-gate-firefox.png已查看。

正式HTTPS浏览器检查四个胶囊按钮、72%圆钮、键盘73%、回放归0与污染扩散入口均通过，无脚本错误。服务器安装器及公网167个运行文件内容/类型/缓存逐项核验通过；Nginx、规范跳转、缺失资源404与既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · GIS污染扩散教学分析（5.12.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor?tool=pollution
- 发布：20261103-pollution-gis-v38；目录/var/www/zhishui/releases/20261103-pollution-gis-v38。
- 备份：/var/backups/zhishui/20261103-pollution-gis-v38；前版20261103-discovery-pair-v37。
- 发布包 SHA-256：3d7fc20e0842df371748a7d7e35dc4dff43dcb2a421fe0fb35d9784c97ad8ee9。

当前发布 `20261103-pollution-gis-v38`（5.12.0）：看水情新增「水情监测 / 污染扩散」两个工作区。污染扩散提供三条真实河道、地图点击设源、质量/流速/弥散/断面/衰减/阈值参数、12小时回放、沿程浓度曲线、三个虚拟断面的到达与峰值分析、40条本机事件记录及GeoJSON导出。模型、流向和断面均为教学设定。入口：https://apsonchian.ltd/zhishui/#/monitor?tool=pollution 。

npm run check全部通过。新增check-pollution.mjs验证真实原始边、球面里程/投影、一维解析模型单位换算、全域和有限河段质量积分、流速/弥散/衰减、峰值极值与超阈求根、上游扩散、GeoJSON结构、记录去重/回放/40条保留/存储回退。

本地Chromium验证1440/1024/901/900/768/600/390/320px无横向溢出且无重复ID；三河段切换、播放/暂停/步进、60分断面一超阈、720分进入及回落记录、刷新保留、回放不重复、参数重算、地图设源/断面定位、GeoJSON导出和单位、键盘左右切换、后台/切页/工作区清理、原暴雨推演均通过。补充实际点选35%里程、0.1%位置精度、运行中减少动态、无Leaflet分析回退、存储完全禁用、河段请求失败后重试，均通过，无页面脚本错误。修正新模块质量输入与结果ID冲突，并让既有台账在localStorage getter被禁止时安全启动。

截图qa/pollution-workspace-1440.png、qa/pollution-map-1440.png、qa/pollution-map-390.png及320px版本已检查。地图浓度色带沿原折线，未绘制陆域污染或淹没范围。

正式HTTPS浏览器复查通过：实际地图点击35%里程设源、带单位的GeoJSON导出、运行中减少动态暂停、缺失Leaflet的分析回退均正常，无页面脚本错误。安装器与公网166个运行文件的内容、类型、缓存逐项核验通过，规范跳转、缺失资源404、Nginx及既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 首页发现卡片协调（5.11.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261103-discovery-pair-v37；目录/var/www/zhishui/releases/20261103-discovery-pair-v37。
- 备份：/var/backups/zhishui/20261103-discovery-pair-v37；前版20261103-river-handoff-v36。
- 发布包 SHA-256：bcf10101f9c18bae18c177253ba53f31c27eae388cd546daf7d30555149a2f26。

当前发布 `20261103-discovery-pair-v37`：南京实景入口改为浅青绿渐变、桥梁水纹线稿，与水利知识卡片共用浅色底、淡线稿和相同图文布局。照片保留在实景列表中，长江大桥、夫子庙、玄武湖的历史卡片仍可打开。

npm run check全部通过。本地浏览器检查1440/390/320px，两卡等高、同一基线，无横向溢出；实景三个地点均可进入历史卡片并返回列表，知识入口与键盘打开/关闭正常。强制颜色模式隐藏装饰线稿，页脚照片来源说明已同步。没有页面脚本错误。三种宽度截图qa/discovery-pair-1440.png、qa/discovery-pair-390.png、qa/discovery-pair-320.png已人工查看。

服务器安装器与公网162个运行文件逐项核验通过；Nginx、规范跳转、缺失资源404与既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 引导河流衔接首页（5.11.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261103-river-handoff-v36；目录/var/www/zhishui/releases/20261103-river-handoff-v36。
- 备份：/var/backups/zhishui/20261103-river-handoff-v36；前版20261103-river-entry-v35。
- 发布包 SHA-256：40642699e1ae47bea1f29334ff88fc1342534cc5297eabcbfffda096d0367387。

点击「进入平台」后不再先关闭引导：将引导页原有SVG河流移入固定覆盖层，保持位置和透明度；文字350ms淡出，背景随后淡出，河流用1800ms的transform/opacity向首页场景缩小移动。首页河流延迟600ms，以1200ms淡入，与原河流交叠。避免首页另放一次独立入场动画。结束后原SVG归位、覆盖层移除、解除平台inert并转移焦点。跳过、键盘、初始减少动态、后台及无WAAPI直接进入；过渡中按键、resize、hashchange、进入后台或偏好变更会结束并清理。非首页深链接保持原目标，使用短淡出。

npm run check全部通过，check-opening.mjs新增原SVG转移、应用提前准备、1800ms/600ms/1200ms时序、重复进入和中断清理回归。本地与正式HTTPS浏览器检查320/390/1440px无横向溢出；0/600/1000/1400ms逐帧截图确认引导河流连续保留、位置变换、双河流透明度交叠及完整归位。键盘、Esc、跳过、减少动态、无WAAPI、初始后台直接显示；运行中Esc、调整窗口、减少动态、后台、切页均清理覆盖层并解除inert。返回首页不重播，监测深链接保持目标，无页面脚本错误。手机和电脑中间帧已人工查看。安装器162文件核验通过，Nginx与既有站点健康。

公网逐项核验162个运行文件的内容、类型和缓存通过；规范跳转、缺失资源404与既有站点健康正常。首次读取超时，重试全部通过。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 首页河流淡入（5.11.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261103-river-entry-v35；目录/var/www/zhishui/releases/20261103-river-entry-v35。
- 备份：/var/backups/zhishui/20261103-river-entry-v35；前版20261102-navigation-lab-v34。
- 发布包 SHA-256：c4dca6531a24a04a8ca13118df4420c0a5c85ef8d9ac1ba23e25b5b5d9a1832c。

首次进入首页时，版面与河流容器先稳定显示，河流Canvas延迟140ms后用1400ms的透明度动画淡入。取消原场景容器的位移入场和首页外层默认位移，延用现有--ease-out曲线；时长与延迟放入motion.css令牌。返回首页不重复播放。键盘进入、系统减少动态或无WAAPI支持时直接显示；切页、后台、按键或偏好变更会清理动画。文字、模型、地形和流水速度未改变。

全部本地检查通过；390/1440px浏览器检查起始、中间、结束画面，确认透明度从0到1、场景容器始终为1、无位移。检查首次播放、返回首页不重播、键盘直入、初始及运行中减少动态、无WAAPI回退均通过，无页面脚本错误。截图qa/river-entry-start-390.png、qa/river-entry-middle-390.png、qa/river-entry-end-390.png已人工查看。安装器162文件核验通过，Nginx与既有站点健康。

公网162个运行文件内容、类型和缓存逐项核验通过，规范跳转、缺失资源404及既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 水文实验与统一导航（5.11.0）

- 日期：2026-11-03，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/experience
- 发布：20261102-navigation-lab-v34；目录/var/www/zhishui/releases/20261102-navigation-lab-v34。
- 备份：/var/backups/zhishui/20261102-navigation-lab-v34；前版20261102-ai-samples-v33。
- 发布包 SHA-256：340851ecea182e0a19320f3e1dbd0363d779120a5930be778a15e63652e9b93e。

水情页删除“选择一场雨”等泛化引导，改为雨强、历时、时间轴等具体状态。水文体验改为径流实验、河湖地图、观察记录三个独立模块，移除前置完成条件和进度计数。实验增加雨强、历时、面积、排水能力四项参数与三种地面对比，按体积守恒显示未形成径流、排出与暂存；可保存六组参数，电脑表格、手机卡片展示，支持删除和导出。地图包含八个地点，点选会放大定位并可返回全景；观察支持可见要素勾选、分照片笔记与导出。v3浏览器存储读取旧v2/v1笔记，旧键不删除。

全站导航统一为首页、看水情、水文体验、AI识别、水利知识；关于作品为页脚次要入口。电脑移除右侧重复导航和页面内重复目录，通知合并至头部；手机底栏前四项与菜单同序，展开菜单隐藏底栏并暂停背景交互，Esc恢复焦点。900px切换完整菜单，支持键盘标签切换。

新增navigation-lab.css与check-journey.mjs。全部本地检查通过，验证水量守恒、雨强/面积/历时/排水效果、参数记录与迁移。浏览器验证320/390/768/900/901/1024/1440px无横向溢出，检查实时值90,000m³、八地点定位、笔记与勾选刷新保留、Markdown导出、键盘切换、菜单与底栏互斥、预警与六张AI例图，无脚本错误。修正体验雨强输出ID与水情全局刷新的冲突。截图见qa/lab-desktop-final.png、qa/navigation-mobile-final.png、qa/lab-records-390.png、qa/lab-map-desktop.png、qa/lab-observation-mobile.png。安装器162文件核验通过，Nginx与既有站点健康。后台模型与接口未变更。

正式HTTPS浏览器的七屏宽完整流程复查通过，无脚本错误。公网162个运行文件的内容、类型、缓存逐项核验通过，规范跳转、缺失资源404及既有站点健康正常。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · AI六张例图（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/ai
- 发布：20261102-ai-samples-v33；目录/var/www/zhishui/releases/20261102-ai-samples-v33。
- 备份：/var/backups/zhishui/20261102-ai-samples-v33；前版20261102-card-covers-v32。
- 发布包 SHA-256：5ee6bca988f779f38fc24d9ad899e930f397be50d3df9d5116e2364d25dd77a0。

AI例图由两张增至六张：保留水下生态与秦淮河岸，新增长江桥梁、玄武湖面、溪流瀑布、海岸水面。长江和玄武湖复用本地照片，瀑布和海岸为新增Commons开放许可实拍；来源、作者、许可在所选照片图片信息中展示，摘要存入photo-credits.json。新增ai-samples.css，选择区电脑三列、手机两列，选中态含描边和勾选。

全部本地检查通过，包括六张照片摘要和许可字段。浏览器验证320/390/1440px无横向溢出、六张照片均解码成功且能正确切换预览和署名；选择图片不会自动请求分析。测试拦截识别接口响应，确认点击开始发送所选图片、纵图压缩至853×1280、换图清空旧结果，没有消耗线上AI次数。未更改后台模型、限额或接口。截图qa/ai-samples-390.png、qa/ai-samples-1440.png已人工查看。安装器161文件核验通过，Nginx与既有站点健康。

公网首次SSL握手超时，重试后161个运行文件的内容、类型、缓存核验全部通过，规范跳转、缺失资源404与既有站点健康通过。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 图片封面与渐变卡片（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-card-covers-v32；目录/var/www/zhishui/releases/20261102-card-covers-v32。
- 备份：/var/backups/zhishui/20261102-card-covers-v32；前版20261102-home-priority-v31。
- 发布包 SHA-256：a76005ac5b6d4d960bf023fc9604a4091adfcda023bc1a24e68f373d0db1b91f。

首页五张入口混用照片和渐变：南京实景为秦淮夜景封面，水利知识为暖金书页渐变，水情为深青等高线渐变，水域识别为水下照片封面，水文体验为浅蓝与暖桃渐变。保持原栏目位置、图标标题并排与既有点击流程。照片加深色蒙层保证白字可读，加载失败保留深色底和文字；没有新增外部图片依赖。

新增card-covers.css，复用现有已署名照片。页脚地图与影像来源补充两张封面的原图、作者、许可和裁切说明，原图片信息保留。全部本地检查通过；本地浏览器验证320/390/1440px无横向溢出，两张封面均加载成功，五张卡片可见，实景、知识与识别入口可用，署名链接完整且无脚本错误。截图qa/card-covers-discovery-390.png、qa/card-covers-functions-390.png、qa/card-covers-functions-1440.png已人工查看。安装器158文件核验通过，Nginx与既有站点健康。

公网HTTPS158个运行文件的内容、类型、缓存核验通过，规范跳转、缺失资源404及既有站点健康通过。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 看水情优先与南京实景分组（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-home-priority-v31；目录/var/www/zhishui/releases/20261102-home-priority-v31。
- 备份：/var/backups/zhishui/20261102-home-priority-v31；前版20261102-knowledge-entry-v30。
- 发布包 SHA-256：18c9afd8a2d03d59c57f79de36fb009bb9f3e41c80af91f00eeb85e9c8cd9407。

首页主按钮改为看水情，水文体验移至次按钮。南京实景与水利知识在首屏下方、功能卡片上方并排。长江大桥、夫子庙秦淮河、玄武湖收进南京实景弹窗；点击地点继续打开原历史卡片，返回实景保留所选地点焦点，关闭返回首页入口。照片署名和历史资料仍可在历史卡片中展开。旧real-water章节链接兼容定位至新入口。

全部本地检查通过；浏览器验证320/390/1440px双卡同排、无横向溢出，主次按钮分别进入水情与体验，三处历史均能返回实景列表、焦点恢复正确，知识入口可打开六篇文章，页面脚本错误为零。截图qa/home-priority-cards-390.png、qa/home-priority-cards-320.png、qa/nanjing-gallery-mobile.png已人工查看。安装器逐项核验157文件通过，Nginx与既有站点健康。

公网HTTPS157个运行文件的内容、类型、缓存核验通过；规范跳转、缺失资源404和既有站点健康通过。报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 首页水利知识入口（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-knowledge-entry-v30；目录/var/www/zhishui/releases/20261102-knowledge-entry-v30。
- 备份：/var/backups/zhishui/20261102-knowledge-entry-v30；前版20261102-river-stories-v29。
- 发布包 SHA-256：a59894185ab7de8733fefac39b70187bb090e127e9c254098819d5fc500b3c89。

南京河湖实景的三张照片下方新增单张水利知识入口卡片，整卡链接至知识库。图标与标题同排，沿用浅青配色与54px图标底座，不添加说明小字；手机将进入知识库操作放在下一行。更新app.js及home-refinement.css资源版本。

全部本地检查通过；浏览器验证320/390/1440px无横向溢出、位置正确、图标标题并排且点击可进入包含六篇文章的知识库，无页面脚本错误。已查看截图qa/knowledge-entry-390.png及qa/knowledge-entry-1440.png。安装器核验157个运行文件通过，Nginx与既有站点健康。

公网HTTPS全部157个文件的内容、类型、缓存校验通过，规范跳转、缺失资源404与既有站点健康检查通过，报告见qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 实景历史与阅读流程（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-river-stories-v29；目录/var/www/zhishui/releases/20261102-river-stories-v29。
- 备份：/var/backups/zhishui/20261102-river-stories-v29；前版20261102-home-refinement-v28。
- 发布包 SHA-256：8ccd5677353596fab82b6fb9bea1bafcbda07c2a2ccfe056511c9c75fd81f142。

六篇水利知识弹窗删除统一的跨栏目跳转，只保留返回知识库。首页三张实景整卡可打开对应历史介绍，取代直接跳入水情地图；历史资料链接与图片署名分别可展开。内容核实来源见 SOURCES.md。看水情标题下新增简短的使用介绍及教学模拟说明。作者指定的完整单段开场保留，线上逐字核对通过。

新增 river-stories.css。弹窗使用具名标题、打开后从顶部阅读，支持键盘进入、Esc关闭及焦点返回；整卡点击不影响图片信息独立展开。全部本地检查通过，线上浏览器验证3处历史弹窗、6篇知识文章、简介及320/390/1440px排版通过，页面脚本错误为零。初次公网SSL握手及桌面字体截图等待超时，重试后均通过。安装器和公网HTTPS核验157个文件、规范跳转、404与既有站点健康通过。报告：qa/server-deployment.json；截图：qa/water-story-mobile.png、qa/water-story-desktop.png、qa/monitor-intro-mobile.png。

---
历史发布记录：

# 当前正式版 · 首页卡片与河流图（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-home-refinement-v28；目录/var/www/zhishui/releases/20261102-home-refinement-v28。
- 备份：/var/backups/zhishui/20261102-home-refinement-v28；前版20261102-opening-single-v27。
- 发布包 SHA-256：49a2f0c04e142b7348dae1294dc0484b580d67b29722b622d15bc8b276177d7e。

三张首页功能卡片的图标与大标题同排，删除说明正文；图标底座从 42px 增至 54px，图形从 24px 增至 32px。整卡链接和原有入口保持可用。新增 home-refinement.css。

河流图消除地形拼接细缝，细化曲面光照、减少等高线密度，强化深青河道、浅色岸线与柔和投影，调整手机画幅及监测点比例。保留流水、后台暂停和系统减少动态行为。

全部本地检查通过，安装器和公网 HTTPS 核验全部 156 个运行文件通过；Nginx 与既有站点健康。线上浏览器已验证 320/390/1440px 无横向溢出、三个卡片图标标题同排、无说明段落且链接可进入水情页，没有脚本错误。截图：qa/home-refinement-mobile.png、qa/home-refinement-desktop.png、qa/home-refinement-river.png。公网报告：qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 单段引导与首页精简（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261102-opening-single-v27；目录/var/www/zhishui/releases/20261102-opening-single-v27。
- 备份：/var/backups/zhishui/20261102-opening-single-v27；前版20261102-alarm-flow-v26。
- 发布包 SHA-256：41bd573f4da860466d9f8ab5cbd4cf7cf82c90efd42be0f966dc55bb83c413b0。

开场采用作者最新提供的完整单段引导语，去掉第二屏、段落编号和上一段操作，主按钮直接进入平台。首页删除标题下「南京河湖地图、水情模拟与图片识别。」简介。更新入口脚本版本参数。

全部本地检查通过，安装器与公网 HTTPS 逐项核验 155 个运行文件通过；规范跳转、缺失资源 404、既有站点和 Nginx 健康正常。浏览器打开超时，未计作本次视觉验收。公网报告见 qa/server-deployment.json。

---
历史发布记录：

# 当前正式版 · 默认动态与预警处理（5.10.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261102-alarm-flow-v26；目录/var/www/zhishui/releases/20261102-alarm-flow-v26。
- 备份：/var/backups/zhishui/20261102-alarm-flow-v26；前版20261102-nav-consistency-v25。
- 发布包SHA-256：664c2a2c7309e52b8b2df497a04bfc214ab1eb307caa54775f30a7c75b954765。
- 共155个公开运行文件。安装器与公网HTTPS逐项核验哈希、类型、缓存通过，规范跳转与缺失资源404正确；Nginx active，既有三处站点返回200。私有AI网关无变更。

新增alarm-experience.css。首页/开屏装饰动态开关移除，默认动态，与模拟数据暂停解耦；保留系统减少动态与后台暂停。预警区改为计数和告警列表，三水域超阈图标2.8秒慢闪轻跳，姓名与读数稳定。数值更新不重建告警图标，手机自动露出选中地点。

铃铛按全区域待处理记录点亮，处理/撤销/升级/恢复/刷新均同步。新增可逐条撤销的批量处置，同步对话框和主台账；修正快速恢复时可能重复的记录ID。新增通知回归并补充地图节点稳定测试。视觉截图来自本地同版前端；AI网关、真实地理资料与水文响应公式无变化，详见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 导航一致性与知识页精简（5.9.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/knowledge
- 发布：20261102-nav-consistency-v25；目录/var/www/zhishui/releases/20261102-nav-consistency-v25。
- 备份：/var/backups/zhishui/20261102-nav-consistency-v25；前版20261102-reading-info-v24。
- 发布包SHA-256：c89770c0235c1b926f90a1b8e9a87b2833e8202cb3c7da1902b79e67bbbc1e91。
- 共154个公开运行文件。安装器与公网HTTPS逐项核验哈希、类型、缓存通过，规范跳转和缺失资源404正确；Nginx active，既有三处站点返回200。私有AI网关无变更。

顶部与右侧导航改用同一份六栏目配置，名称、顺序及现有当前栏目高亮一致；手机展开菜单同步补齐六项。保留手机常用底栏，桌面字号维持18px，窄屏菜单可滚动。知识页目录从DOM移除，保留分类、搜索、文章卡片与兼容旧链接的章节定位属性。没有改动其他页面目录、AI、水文或地图行为。截图与本地同版验收见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 说明字号与图片信息（5.8.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/ai
- 发布：20261102-reading-info-v24；目录/var/www/zhishui/releases/20261102-reading-info-v24。
- 备份：/var/backups/zhishui/20261102-reading-info-v24；前版20261102-map-alerts-v23。
- 发布包SHA-256：d9872198df1c10f0a89efba9753f58d054d0352debc7c77d09816ae6f9f15a36。
- 共154个公开运行文件。安装器与公网HTTPS逐项核验哈希、类型、缓存通过，规范跳转和缺失资源404正确；Nginx active，既有三处站点返回200。私有AI网关无变更。

新增reading-details.css，AI说明标题/正文分别为24/20px，手机22/18px；修复旧样式把正文覆盖为12px的问题。照片长署名改为默认收起的原生图片信息，保留作品标题、原图链接、作者、许可与展示修改说明，首页与实景观察同步。原有照片、AI请求逻辑、地图和水文模型不变。本地同版截图与验收见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 地图交互与模拟预警（5.7.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261102-map-alerts-v23；目录/var/www/zhishui/releases/20261102-map-alerts-v23。
- 备份：/var/backups/zhishui/20261102-map-alerts-v23；前版20261102-simulation-v22-final。
- 发布包SHA-256：2d8e0820dea9142b756aa8e841f9bc048ce3b031fe9288961fc4bc7f2d09b582。
- 共153个公开运行文件。安装器与公网HTTPS逐项核验哈希、类型、缓存通过，规范跳转与缺失资源404正确；Nginx active，既有三处站点均返回200。私有AI网关无变更。

新增map-workbench.css，地图扩展为主视区，读数移至下方；新增可直接定位的模拟预警区、橙/红分级与文字/符号辅助。标记节点稳定、名称避让、弹窗与地点/巡检联动；修复重复点选的原生弹窗冲突及移动端点选滚离地图的问题。地理背景保留本地公开数据，放大显示已有道路/地标名，街道图使用在线真实底图岸线；湖泊按各自教学状态着色。新增地图行为回归。视觉截图来自本地同版前端，详见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 降雨推演与底部导航（5.6.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261102-simulation-v22-final；目录/var/www/zhishui/releases/20261102-simulation-v22-final。
- 备份：/var/backups/zhishui/20261102-simulation-v22-final；前版20261102-simulation-v22（本轮初版）；此前版本20261102-reading-v21。
- 发布包SHA-256：d3456629f3a5e4a33d369dec9e3c1c0b659ee33eb3245b3eb3ea74948f60e326。
- 共152个公开运行文件。安装器与公网HTTPS逐项核验哈希、类型、缓存通过；规范跳转与缺失资源404正确。Nginx active，既有三处站点均返回200。私有AI网关无变更。

手机固定底栏12px黑体，页脚快速导航16/15px黑体。新增simulation.css，三种雨量预设、40分钟自动停雨、即时停雨/步进回放、渐进调闸与未调节虚线对照。雨量与调闸操作保留时间记录，不重写此前曲线；湖泊独立缓慢响应。所有水文读数仍为教学模拟。模型与浏览器验收见qa/VERIFICATION.md；截图来自本地同版前端。

---
历史发布记录：

# 当前正式版 · 字号与小字精简（5.5.0）

- 日期：2026-11-02，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/knowledge
- 发布：20261102-reading-v21；目录/var/www/zhishui/releases/20261102-reading-v21。
- 备份：/var/backups/zhishui/20261102-reading-v21；前版20261101-plain-copy-v20。
- 发布包SHA-256：84092447beefade81d8e97b10d39749129cd24841e2ed9297ef93202b006d72a。
- 共151个公开运行文件。安装器和公网HTTPS逐文件哈希、类型与缓存核验通过，目录规范跳转与缺失资源404正确，Nginx active、既有站点健康。私有AI网关无变更。

新增reading-scale.css，放大页面标题、卡片标题/正文、按钮、图表文字与监测读数。移除重复小字和装饰性说明，保留来源、单位、模拟标识、完整开屏引言与识别局限。手机通过换行和单列布局适应更大字号，电脑宋体/手机黑体保持。视觉验收截图来自本地同版前端。

---
历史发布记录：

# 当前正式版 · 页面文案（5.4.0）

- 日期：2026-11-01，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/knowledge
- 发布：20261101-plain-copy-v20；目录/var/www/zhishui/releases/20261101-plain-copy-v20。
- 备份：/var/backups/zhishui/20261101-plain-copy-v20；前版20261101-right-dock-v19。
- 发布包SHA-256：eb98c88d3e845f20069256e50ed9c9f17388df60c1fb9cdaf7db4605c1fd459e。
- 共150个公开运行文件。安装器逐项核验、Nginx active、既有站点健康。私有AI网关无变更。

改写固定页面文案：具体功能名、动作名和概念标题替代隐喻、反复引导与鼓励语。导航统一为水文体验，关于页改为功能/数据/分工。保留作者指定的两段开屏原文、主标语、来源与模拟/AI局限说明。不改动数据字段、模型、布局动效、路由或后台服务。

---
历史发布记录：

# 当前正式版 · 电脑侧边导航（5.3.1）

- 日期：2026-11-01，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261101-right-dock-v19；目录/var/www/zhishui/releases/20261101-right-dock-v19。
- 备份：/var/backups/zhishui/20261101-right-dock-v19；前版20261101-footer-links-v18。
- 发布包SHA-256：b3c02a17f84e43360592ba4c2b893630b1f4d13ae2cc1627e98e874dc4ff83ed。
- 共150个公开运行文件。安装器逐文件核验、Nginx active、既有站点健康。私有AI网关无变更。

新增desktop-dock.css与六栏目/回顶胶囊导航。复用既有路由、SVG图标和回顶行为，路由提交时同步aria-current。1024px以上预留88px侧边空间；窄屏隐藏且inert，手机底栏保留。键盘焦点显示文字提示，开屏期间随平台隐藏。无新库、接口或存储。

---
历史发布记录：

# 当前正式版 · 导航与页脚（5.3.0）

- 日期：2026-11-01，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261101-footer-links-v18；目录/var/www/zhishui/releases/20261101-footer-links-v18。
- 备份：/var/backups/zhishui/20261101-footer-links-v18；前版20261101-opening-v17。
- 发布包SHA-256：9ed3f44dd52c581f7ac74d7656a103ef45bc8f9fb3c629e2dcb8507163b40513。
- 共149个公开运行文件。安装器逐项核验、Nginx active、既有站点健康。私有AI网关无变更。

新增site-footer.css与三栏页脚，首页改用功能名称和短说明，favicon.svg更换为统一的河流标识。当前地址链接显式回顶/章节定位，跨栏目仍使用原生路由，保留修饰键、新标签页、下载和外链行为。锚点设置固定导航避让；站内路由清理已打开的详情弹窗。新增check-links.mjs覆盖该回归。

---
历史发布记录：

# 当前正式版 · 两幕开屏（5.2.0）

- 日期：2026-11-01，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261101-opening-v17；目录/var/www/zhishui/releases/20261101-opening-v17。
- 备份：/var/backups/zhishui/20261101-opening-v17；前版20261031-river-motion-v16。
- 发布包SHA-256：288daf1f5171d2507fcb3281af80212465b5dd8fe330e2ba00e050fb47d3849a。
- 共148个公开运行文件。安装器逐项核验、Nginx active、既有站点健康。私有AI网关无变更。

新增opening.css/opening.js与HTML开屏区域；平台初始隐藏，只有访客读完或跳过后才启动路由/数据定时器。两幕完整保留原文，允许返回、跳过与Esc，保留原目标栏目。不自动推进，不保存已读状态，整页刷新重新展示，站内路由不重播。无新依赖或追踪；支持暂停、后台与减少动态。

---
历史发布记录：

# 当前正式版 · 流域动效（5.1.0）

- 日期：2026-10-31，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261031-river-motion-v16；目录/var/www/zhishui/releases/20261031-river-motion-v16。
- 备份：/var/backups/zhishui/20261031-river-motion-v16；前版20261031-line-arrows-v15。
- 发布包SHA-256：f8e8f174c0d63752f5f73c5f5acf538e8db570664d3210e7402f25196066bd55。
- 共146个公开运行文件。安装器逐文件检查、Nginx active、既有站点健康。私有AI网关无变更。

首页地形从密集网格改为缓存的明暗地形与等高线；流线连续渐隐，折射与监测涟漪分层运动。新增motion.css统一按压/悬停反馈；page-transition.js增加可清理的一次性首页入场与滚动揭示。支持暂停、离屏、后台和减少动态，键盘交互直接响应。详见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 单色线性箭头（5.0.2）

- 日期：2026-10-31，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/home
- 发布：20261031-line-arrows-v15；目录/var/www/zhishui/releases/20261031-line-arrows-v15。
- 备份：/var/backups/zhishui/20261031-line-arrows-v15；前版20261031-unified-ui-v14。
- 发布包SHA-256：3f3e436a4202f7d908a49be004f57d050068ef40e63cad30b3d6788707154060。
- 共145个公开运行文件。私有AI网关无变更。

27处字符箭头改为assets/ui-icons.svg复用图标，统一线宽与currentColor，不使用emoji字形。指针事件落到原链接/按钮，装饰图标aria-hidden，不改变既有交互。手机点击相关水域仍正确定位长江大桥教学点。

---
历史发布记录：

# 当前正式版 · 统一响应式界面（5.0.1）

- 日期：2026-10-31，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/knowledge
- 发布：20261031-unified-ui-v14；目录/var/www/zhishui/releases/20261031-unified-ui-v14。
- 备份：/var/backups/zhishui/20261031-unified-ui-v14；前版20261031-sandbox-v13。
- 静态包SHA-256：d1ec2f8dce25889ef2b67cb80915189cf0876f62b70527b992b4e28719017f73。
- 安装器验证144个运行文件，Nginx与既有站点健康。私有AI网关未改变。

新增最终样式层responsive-unified.css，统一两端组件视觉；手机保留黑体、单列与底栏。知识卡片用原生阅读按钮的整卡点击区域复用原阅读交互，不增加重复Tab焦点。桌面整卡主体、手机图片区域、搜索后Enter阅读已通过浏览器检查。窄屏320px水情/AI/首页/体验、390px知识库无页面横向溢出。详情见qa/VERIFICATION.md。

---
历史发布记录：

# 当前正式版 · 流域互动沙盘（5.0.0）

- 日期：2026-10-31，Asia/Shanghai。
- 地址：https://apsonchian.ltd/zhishui/#/monitor
- 发布：20261031-sandbox-v13；目录/var/www/zhishui/releases/20261031-sandbox-v13。
- 备份：/var/backups/zhishui/20261031-sandbox-v13；前版20261030-water-only-v12。
- 静态包SHA-256：bf9254c2a0058455b2d0ea8d527f27be7c31a3e06e65f9d5c16969d910f83c0a。
- 安装器验证143个运行文件；Nginx active，既有站点健康。
- 私有图像网关继续使用20261030-water-only-v12，本轮无密钥或网关变更。

新增纯前端教学模型hydro-sandbox.js和界面样式hydro-workbench.css；不安装额外动画依赖。巡检/预警台账在访问者本机localStorage保存，不传到服务器，跨设备不共享。源包包含模型、测试及已有私有网关源码，不包含密钥。

本地同一份前端连接正式HTTPS识图接口验证完整巡检流程，另逐文件核对公网资源；验收记录见qa/VERIFICATION.md。水文分级、时滞和闸门为教学规则，不是官方阈值、水力仿真或设备控制。

---
历史发布记录：

# 当前正式版 · 水域判断与视觉精简（4.5.1）

- 正式地址：https://apsonchian.ltd/zhishui/#/ai
- 日期：2026-10-30，Asia/Shanghai。
- 前端与私有网关发布：20261030-water-only-v12。
- 公开目录：/var/www/zhishui/releases/20261030-water-only-v12。
- 备份：/var/backups/zhishui/20261030-water-only-v12；前版20261030-real-vision-v11b。
- 静态包SHA-256：76610d802d606bcfe8a127f98c5b69f522cb8e666fb202649f982d7619b2ea45。
- 141个运行文件已由安装器核验，Nginx与既有站点健康。

模型先返回water/non_water/uncertain分类，非water分支由网关强制返回unsupported与固定换图提示，不暴露summary/findings。缺失或未知分类报错，不默认为水域。前端unsupported分支清空旧结果、隐藏原图对照和导出，仅呈现换图提示与水下示例入口。判断依赖视觉模型，仍可能误判。

页面减少重复小字，保留摄影许可与简短发送说明。完整说明按需展开。密钥与私有网关部署方式沿用下方记录。

---
历史发布记录：

# 当前正式版 · 真实图像观察与地图背景（4.5.0）

- 正式地址：https://apsonchian.ltd/zhishui/#/ai
- 日期：2026-10-30，Asia/Shanghai。
- 发布：20261030-real-vision-v11b；目录/var/www/zhishui/releases/20261030-real-vision-v11b。
- 备份：/var/backups/zhishui/20261030-real-vision-v11b；前一版20261030-real-vision-v11。
- 发布包SHA-256：a4c6a03def2999fb222d87ddfd7cdb821024eee44ea1da7691c087c3c32235a4。
- 141个公开文件经服务器与公网HTTPS校验；Nginx与既有站点健康。
- 私有网关：/opt/zhishui-ai/current → releases/20261030-vision-v11-final2；systemd zhishui-ai；127.0.0.1:5192。
- 密钥仅在/etc/zhishui/vision.env，root:root 0600；源码包与静态包均不包含密钥。计数状态在/var/lib/zhishui-ai，图片不落盘；Nginx请求体缓冲3MB。

水下实拍与上传的秦淮河照片均通过正式HTTPS接口返回不同的真实观察，框选位置与原图对照可用，JSON导出已验证。页面不展示供应商或模型名称。地图增加真实地理背景及沿中心线绘制的水面宽度示意，全景按钮有复位和反馈。

验收边界：正式URL在内置浏览器读取超时；视觉与上传/识别流程通过本地同一份静态前端、连接正式HTTPS接口完成，并另逐文件核对公网资源。不能将其表述为正式URL浏览器视觉验收。截图与记录见qa/VERIFICATION.md。

---
以下为历史发布记录，旧AI模拟说明不代表当前行为。

# 当前正式版 · 简单交互与水系地图

- 日期：2026-10-30，Asia/Shanghai。
- 首页：[智水监测](https://apsonchian.ltd/zhishui/#/home)；地图：[看水情](https://apsonchian.ltd/zhishui/#/monitor)；推荐：[新手体验](https://apsonchian.ltd/zhishui/#/experience)。
- 界面版本：4.4.0；发布版本：`20261030-simple-flow-v10`。
- 目录：`/var/www/zhishui/releases/20261030-simple-flow-v10`。
- 备份：`/var/backups/zhishui/20261030-simple-flow-v10/`，上一版 `20261030-songti-quiet-v9`。
- 发布包SHA-256：`86aaf44f4bdf1e8f68189f757a36e4b398417ca779baea1f54219c251c77bd06`。

安装器与公网HTTPS逐项校验138个文件，Nginx及既有站点健康。

主导航与手机底栏收敛为四项，知识与关于在页尾。首页推荐新手体验，减少重复仪表盘。地图采用真实水系中心线与湖泊数据的清爽线图，街道图可选；编号对应地点列表，选点即可看读数，手机自动定位读数。曲线与数据按需展开，水位上涨用原页颜色反馈。

三步体验变为定位、一键比较、可选观察并完成；取消手动凑对照组与必答测验。新流程使用v2本机存储，保留旧版照片观察文字。识别页初始突出开始演示，高级操作折叠。字体仍为电脑宋体、手机黑体。

自动检查和桌面/手机主要流程通过，详细范围见qa/VERIFICATION.md；演示路径见DEMO.md。

---

# 电脑宋体与信息精简（历史）

- 日期：2026-10-30，Asia/Shanghai。
- 地址：[智水监测](https://apsonchian.ltd/zhishui/#/ai)。
- 界面版本：4.3.1；发布版本：`20261030-songti-quiet-v9`。
- 目录：`/var/www/zhishui/releases/20261030-songti-quiet-v9`。
- 备份：`/var/backups/zhishui/20261030-songti-quiet-v9/`，上一版 `20261030-vision-lab-v8`。
- 发布包SHA-256：`a2220edb11c2f6c37fa8997b6ab70877935a9109152845e911857ec452d18f4b`。

安装器与公网HTTPS逐项校验137个文件，原站点和Nginx健康。

电脑端使用项目内本地宋体，手机保留系统黑体；图表字体跟随页面。全站精简装饰标签、重复副标题和提示；AI的详细边界/使用说明、目标解读、地图坐标来源按需展开。正常地图加载提示不占位，加载异常仍显示。摄影署名、许可、数据单位和预警状态保留。具体验证见qa/VERIFICATION.md。

---

# AI 水下视觉实验室（历史）

- 日期：2026-10-30，Asia/Shanghai。
- 入口：[AI 水下视觉实验室](https://apsonchian.ltd/zhishui/#/ai)。
- 界面版本：4.3.0；发布版本：`20261030-vision-lab-v8`。
- 目录：`/var/www/zhishui/releases/20261030-vision-lab-v8`。
- 备份：`/var/backups/zhishui/20261030-vision-lab-v8/`，上一版 `20261030-layout-controls-v7`。
- 发布包SHA-256：`fd6315e3eba9f60f0e2b1ef1fed827f048556755557b47b30779bbe27ec36e90`。

AI栏目重做为图像工作台和标注探索面板，新增生态/设施两个原创示例、可取消的扫描流程、框与卡片双向选中、原图对照、分数筛选、目标教学解读和JSON导出。本地上传显示文件名与尺寸，仅预览并叠加通用固定框，不上传图片、不调用真实识别模型。更换场景、替换图片和离开页面会取消旧任务。

服务器安装器与公网HTTPS逐项核对136个运行文件，Nginx和旧站健康。

本地1280px、390px和320px的主要流程及自动检查通过；验证范围见qa/VERIFICATION.md，截图ai-workbench-desktop.png和ai-workbench-mobile.png。

---

# 排版整理与交互修复（历史）

- 日期：2026-10-30，Asia/Shanghai。
- 地址：[智水监测](https://apsonchian.ltd/zhishui/#/home)。
- 界面版本：4.2.1；发布版本：`20261030-layout-controls-v7`。
- 目录：`/var/www/zhishui/releases/20261030-layout-controls-v7`。
- 备份：`/var/backups/zhishui/20261030-layout-controls-v7/`，上一版 `20261029-mobile-tabbar-v6`。
- 发布包SHA-256：`65ea9f6b96b52d04bf5f5fb28b7c6b6f78daacbc61df5d3e7f7fbb3b64057653`。
- 安装器与公网HTTPS均逐项验证133个运行文件、资源类型、缓存与旧站健康。

首页文字与动画分栏，统一页面字阶与留白，监测页按地图/趋势/预警/点位表组织。修复手机菜单点击当前页不关闭的问题，扩大触控区域；AI空图可一键示例识别，未完成任务的继续/导出操作有提示。保留浅色黑体、两行渐变标题、真实地理与摄影、三步守水体验和手机固定底部导航。

本地桌面与手机主要交互及现有自动检查通过。完整验证范围与截图见qa/VERIFICATION.md。只更新作者服务器的/zhishui/；早期Sites独立副本未重新发布。

---

# 手机版固定底部导航（历史）

- 日期：2026-10-29，Asia/Shanghai。
- 地址：[智水监测](https://apsonchian.ltd/zhishui/#/home)。
- 界面版本：4.1.1；发布版本：`20261029-mobile-tabbar-v6`。
- 目录：`/var/www/zhishui/releases/20261029-mobile-tabbar-v6`。
- 备份：`/var/backups/zhishui/20261029-mobile-tabbar-v6/`，上一版 `20261029-blacktype-navigation-v5`。
- 发布包SHA-256：`026d8afb10560c18321a9c31823f8bf2c4a8d63ebd6a019403d66b537eaf8054`。
- 服务器安装器与公网HTTPS均逐项校验133个文件，原有站点正常。

手机宽度下新增六入口固定底部导航，当前页高亮与aria-current同步。顶部菜单展开时底栏不可交互；桌面隐藏。页尾、安全区与提示消息预留底栏空间；底栏位于换页动画容器外，切页时保持固定。390px手机预览检查跳转、高亮、滚动位置和页尾/提示遮挡，现有自动检查通过。截图qa/mobile-bottom-nav.png。

---

# 黑体排版、换页动画与内容导览版（历史）

- 日期：2026-10-29，Asia/Shanghai。
- 地址：[首页](https://apsonchian.ltd/zhishui/#/home)。
- 界面版本：4.1.0；发布版本：`20261029-blacktype-navigation-v5`。
- 目录：`/var/www/zhishui/releases/20261029-blacktype-navigation-v5`。
- 备份：`/var/backups/zhishui/20261029-blacktype-navigation-v5/`，上一版 `20261029-title-gradient-v4`。
- 发布包SHA-256：`f5a2191364d35c8740a782ed692e993a3138d7a26659f693c7e40df5a7726662`。
- 服务器安装器与公网HTTPS均逐项验证133个文件，Nginx与旧站健康检查通过。

系统黑体覆盖页面、图表、地图标记、Canvas场景和控件。全站调整文字层级、字距、行距与标题换行，首页两行上下渐变保留。六个页面编号、本页导览及可复制深链接清晰区分。页面过渡80ms淡出加200ms轻移淡入，可取消旧导航；键盘、减少动态和暂停动态模式直接切换。资源增加版本参数，避免缓存旧排版。

本地桌面/手机与现有检查通过，详细验收见qa/VERIFICATION.md。截图blacktype-navigation.png。页面使用系统字体，未进行所有系统字体和真实设备的跨设备测评。

---

# 首页两行纵向渐变标题版（历史）

- 日期：2026-10-29，Asia/Shanghai。
- 地址：[首页](https://apsonchian.ltd/zhishui/#/home)。
- 发布版本：`20261029-title-gradient-v4`。
- 目录：`/var/www/zhishui/releases/20261029-title-gradient-v4`。
- 备份：`/var/backups/zhishui/20261029-title-gradient-v4/`，上一版 `20261029-real-water-v3`。
- 发布包SHA-256：`cb2c051eb81bb2ab91df4549c78646d952d487094dc361663b316ac2c27d62cc`。

“智联千川”和“AI 护水利”保持两行宋体，两行文字均从上方深青向下方湖蓝渐变；保留字号和原有入场动画。高对比模式回退到系统文字色。本地首页截图见 `qa/gradient-title.png`，现有自动检查通过，服务器安装器及公网HTTPS逐项校验131个文件与旧站健康通过。

---

# 真实水系与守水体验版（历史）

- 地址：[智水监测](https://apsonchian.ltd/zhishui/)，体验入口 [守水体验](https://apsonchian.ltd/zhishui/#/experience)。
- 日期：2026-10-29，Asia/Shanghai。
- 版本：`20261029-real-water-v3`（界面版本4.0.0）。
- 当前目录：`/var/www/zhishui/releases/20261029-real-water-v3`。
- 备份：`/var/backups/zhishui/20261029-real-water-v3/`，上一版 `20261029-light-songti-v2`。
- 发布包SHA-256：`60f5269b74a9804bd60af67601b2b951b04cd5516e500bba39928d5b03e612fc`。
- 服务器安装器与公网HTTPS均核对131个运行文件；Nginx active，旧站及工坊健康检查通过。
- 公网资源摘要、JS/CSS类型、缓存、跳转与缺失文件404通过；本地桌面/手机交互通过。正式URL的浏览器自动化读取超时，未计作本轮公网视觉验收。

本次在独立路径更新真实OSM地理底图、本地水系快照、带署名及许可的实景照片和三步守水体验；保留浅色宋体与河流动画。街道底图需要联网，本地真实水系轮廓不依赖瓦片加载。资料与教学模型边界见SOURCES.md。

---

# 浅色宋体版（历史）

- 地址：[智水监测](https://apsonchian.ltd/zhishui/)
- 日期：2026-10-29，Asia/Shanghai。
- 版本：`20261029-light-songti-v2`（界面版本 3.0.0）。
- 当前目录：`/var/www/zhishui/releases/20261029-light-songti-v2`。
- 备份：`/var/backups/zhishui/20261029-light-songti-v2/`，上一版为 `20261029-zhishui-cinematic-v1`。
- 发布包 SHA-256：`5b127abcfa034c759e8a1c3255d981e2944505beb124b63106ead3961dde4dd1`。

默认浅色、全站本地思源宋体、放大桌面及手机字号。河流使用更长的连续轨迹与舒缓节点涟漪，首次入场更舒展；暂停、减少动态与离屏/后台暂停行为保留。字体许可位于 `dist/assets/vendor/Noto-Serif-SC-LICENSE.txt`。

本地数据交互与动画生命周期检查通过，101 个字体分片完整。1440px 桌面及390px手机页面可视化检查通过，首页与监测页没有横向溢出。服务器端与公网逐项核对 113 个运行文件（含101个宋体分片），资源摘要与本地一致，原站点继续返回200。正式HTTPS页面已在浏览器打开，显示浅色宋体新版。

---

# 首次服务器部署（历史记录）

- 正式地址：[智水监测](https://apsonchian.ltd/zhishui/)
- 日期：2026-10-29，Asia/Shanghai。
- 版本：`20261029-zhishui-cinematic-v1`。
- 运行源码基线：`fe99f019a7cd54deebd4f576d334cecef10543ce`。
- 发布目录：`/var/www/zhishui/releases/20261029-zhishui-cinematic-v1`。
- 当前入口软链接：`/var/www/zhishui/current`。
- Nginx 片段：`/etc/nginx/snippets/zhishui-location.conf`。
- 配置与回滚信息：`/var/backups/zhishui/20261029-zhishui-cinematic-v1/`。
- 发布包 SHA-256：`d85341140a94d81cc4f4a96d9e64752e636d23beb1a86acc95adc7ab928ec248`。

本次部署到作者已有服务器的独立 `/zhishui/` 路径，继承域名的现有 HTTPS。静态资源公开可访问，不需要 ChatGPT 登录。原有主站、共创工坊与其他业务入口保留。先前创建的 Sites 站点仍作为独立副本保留，本次没有修改其访问权限或重新发布。

## 本次验证

安装器校验归档摘要，保存原始 Nginx 配置与旧链接信息，将静态资源放入独立 release，然后原子切换 `current`。`nginx -t`、平滑 reload、站点 HTML 与全部资源校验通过。

公网 HTTPS 再次验证全部 10 个运行文件返回 200；JS/CSS 类型正确、资源摘要与本地一致，HTML 支持现有服务器的统计脚本插入。`/zhishui` 正确跳转到 `/zhishui/`，不存在的资源返回 404，资源使用 `no-cache` 避免固定文件名导致的旧版本缓存。

原 `/`、`/ai-odyssey/`、`/v79/` 均返回 200；共创工坊数据库健康状态为 ready，Nginx active。本次不迁移数据库、不重启业务 API、不修改防火墙、域名证书或现有 IP 入口策略。

本轮已完成公网 HTTP 与资源校验。应用视觉和交互沿用此前验证的相同静态文件；本轮内置浏览器打开操作超时，未计作新的可视化验收。

## 后续更新

1. 在本项目执行 `npm run check` 和 `python3 scripts/package-server.py`。
2. 使用服务器已有的 SSH 身份上传归档、`deploy/install-server.py` 和 `deploy/zhishui-location.conf` 到专用临时目录。
3. 以新的、不重复的版本号执行安装器，传入归档 SHA-256。安装器保留旧版本，校验失败时自动恢复本次修改的配置和链接。
4. 执行 `python3 scripts/verify-server.py`，确认公网文件和既有入口正常。

安装器参数：

```text
python3 install-server.py --archive <归档路径> --sha256 <摘要> --snippet <片段路径> --version <新版本号>
```

回退已成功发布的版本时，先读取对应备份的 `previous.json`，核对当前配置是否有后续修改，再恢复该站点的 include/片段与 `current` 链接，运行 `nginx -t` 后平滑重载。不要用旧备份整份覆盖包含后续其他业务变更的 Nginx 配置。首次发布没有上一版智水链接，回退即撤销本站路由。

仓库与源码包不保存服务器私钥、密码、环境变量或生产数据库。

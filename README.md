### webtim是 Web通讯平台

> webtim通讯服务器是 Tim。前端使用tim的js客户端 timjs 调用tim服务器接口渲染页面。
webtim开发目的是通过界面来显示表达tim接口功能。tim是去中心化的分布式IM引擎。支持基础通讯模式，对端到端的数据流传输支持非常全面，几乎涵盖了所有端到端的通讯需求，所以webtim可以非常流畅的实现任意通讯需求。
但tim的强大并非其通讯模式，而是去中心化的集群功能，tim的水平扩展能力非常强，可以支持成千上万的节点集群，没有中心依赖和限制，支持数据分布式存储，数据库节点动态扩容。

------------

###### webtim的im功能：用户注册，登录，修改资料，用户关系功能系列操作，群功能系列操作，用户状态传输，通信数据传输。

###### webtim的流实现：实时视频电话，个人直播，视频播放直播，多人视频会议等


- [TIM开发使用文档](https://tlnet.top/timdoc "TIM开发使用文档")
- [TIM即时通讯引擎](https://tlnet.top/tim "TIM即时通讯引擎")
- [webtim源码地址](https://github.com/donnie4w/webtim "webtim源码地址")  
- [timjs源码地址](https://github.com/donnie4w/timjs "timjs源码地址")
- [Tldb分布式数据库](https://tlnet.top/tldb "Tldb分布式数据库")

### 说明：

1. webtim的im通讯逻辑功能是在tim服务端处理完成的，webtim用js处理tim返回的处理结果，并将数据渲染到页面展示。所以，使用tim进行IM通讯是跨平台的，web端，安卓，苹果等终端可以通过调用tim接口，进行业务上的数据通讯或业务处理。
2. webtim不是专门的直播平台，只对视频进行简单采集。有时卡顿现象主要是采集数据出现错误或数据解析错误导致，更好的视频体验需要对采集数据做更细致的处理
3. 注册webtim的账号是信息安全的。tim不会记录注册者的账号，tim是内置账号系统，使用内置账号通讯。而且通讯信息加密，用户资料加密，所以，用户不必担心资料泄密，即使是tim作者本人，也没法反向获取用户的账号密码等信息。这一点在开源代码中可以体现


#### webtim功能截图：

![](https://tlnet.top/f/1703486393_30316.jpg)

![](https://tlnet.top/f/1703486409_25438.jpg)

##### 视频直播功能截图：

![](https://tlnet.top/f/1703438539_20027.jpg)

![](https://tlnet.top/f/1703438565_3925.jpg)

![](https://tlnet.top/f/1703438581_16795.jpg)

![](https://tlnet.top/f/1703438603_442.jpg)


------------


**有任何问题或建议请Email：donnie4w@gmail.com或 https://tlnet.top/contact  发信给我，谢谢！**
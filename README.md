# FIT 文件对比工具

## 项目简介

FIT 文件对比工具是一个基于 Web 的应用程序，允许用户上传和比较多个 FIT（Garmin Workout）文件。这个工具特别适用于分析和比较来自不同设备或不同时间的运动数据。

## 主要功能

- 支持多个 FIT 文件的上传和解析
- 提供基于时间或距离的数据可视化
- 使用 Chart.js 生成交互式图表
- 支持图表缩放和平移，方便详细查看数据
- 显示文件处理时间，优化性能体验

## 技术栈

- JavaScript (ES6+)
- HTML5
- CSS3
- Webpack 5
- Chart.js
- fit-file-parser

## 安装和运行

确保你的系统中已安装 Node.js 和 npm。然后按照以下步骤操作：

1. 克隆仓库：
   ```bash
   git clone https://github.com/L1cardo/fit-file-comparison-tool.git
   cd fit-file-comparison-tool
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm start
   ```

4. 打开浏览器，访问 `http://localhost:9000`

## 构建生产版本

运行以下命令来构建生产版本：

```bash
npm run build
```

构建后的文件将位于 `dist` 目录中。

## 使用说明

1. 点击"选择FIT文件"按钮，选择要比较的 FIT 文件（可多选）。
2. 点击"对比"按钮开始处理文件。
3. 选择"时间"或"距离"作为 X 轴数据。
4. 在生成的图表上，可以使用鼠标滚轮或触控板进行缩放，拖动来平移查看。

## 贡献

欢迎提交问题和合并请求。对于重大更改，请先开issue讨论您想要改变的内容。

## 许可证

[ISC](https://choosealicense.com/licenses/isc/)

## 作者

Licardo

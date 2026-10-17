# Lens Lab｜單眼鏡頭實驗室

全螢幕 3D 單眼相機與 24–70 mm 變焦鏡頭教學展示，支援直接旋轉對焦環與變焦環、操作光圈、拆解鏡頭，以及切換光學觀景窗與 Live View。

成像面、取景預覽與輸出照片均為 3:2。機身可觀察反光鏡、快門簾、對焦屏、五稜鏡與 CMOS；「成像透視」讓背面也能觀看成像，實際感光元件並不透明。

## 使用

根目錄的 `index.html` 已包含程式、樣式與材質，可直接以支援 WebGL 的瀏覽器開啟。使用 Node.js 20 以上也可啟動本機伺服器：

```sh
npm start
```

開啟 http://127.0.0.1:4173/。

## 開發與建置

```sh
npm ci
npm test
npm run build
```

完整建置會重新生成零件構造圖與 3D 展示，輸出至根目錄的 `index.html`，並保留 `dist/diagram.html` 作為構造圖快取（不納入 Git）。所有輸出都位於此專案內。首次建置後，僅修改 3D 場景、介面或說明時可用 `npm run build:lab` 快速重建；修改構造圖幾何時使用完整建置。

## 操作

- 沿對焦環／變焦環拖曳，分別調整清晰距離與焦距。
- 空白處拖曳旋轉視角，滾輪縮放。
- 「單眼機身」切換取景方式、成像透視、成像圈與景深預覽。
- 「零件圖鑑」查看 12 個主要零件的功能；「構造圖解」查看等角透視示意。
- H 隱藏介面，空白鍵拍照；快門動作刻意放慢，便於觀察。

## 原始碼

- `lab.js`、`camera-body.js`：3D 場景、互動與機身模型。
- `camera-mechanics.mjs`、`optics.mjs`：機構時序、對焦、景深與模糊計算。
- `parts.mjs`：零件說明；`app.js`：構造圖互動。
- `build.mjs`、`build-lab.mjs`：構造圖生成與獨立 HTML 打包。
- `check-optics.mjs`、`check-mechanics.mjs`：光學與機構檢查。
- `kit/`：Anatomy SVG 工具與其授權。

## 範圍與授權

此展示以一般全片幅數位單眼與變焦鏡頭為基準，非特定品牌的維修模型。鏡片片數、曲率、配置及行程經教學簡化；光束並非逐片光線追跡。防手震為選配機構，對焦距離選取 0.35–20 m 作示範。構造參考連結列於「單眼機身」面板。

第三方程式使用 [Anatomy](https://github.com/wheresryan22/anatomy) 與 [Three.js](https://threejs.org/)，均採 MIT 授權；Anatomy 授權保留於 `kit/LICENSE`；Three.js 授權由已安裝套件帶入，兩者的完整文字均包含在輸出的 `index.html` 內。

# html-inline-assets-loader

自动处理 html 文件中的相对引用 css/js 或者 link 中的图片资源 文件，直接内联到 html 文件中，或者自动编译并拷贝到 dist 目录

# useage

```js
const configureHtmlLoader = () => {
  return {
    test: /\.(html|njk|nunjucks)$/,
    use: [
      resolve('html-loader'),
      // 自动处理html中的相对路径引用 css/js文件
      resolve('html-inline-assets-loader'),
      {
        loader: resolve('nunjucks-html-loader'),
        options: {
          // Other super important. This will be the base
          // directory in which webpack is going to find
          // the layout and any other file index.njk is calling.
          searchPaths: ['./src'],
        },
      },
    ],
  };
};
```

HTML file

```html
<!--auto transform and copy-->
<link rel="shortcut icon" type="image/ico" href="./assets/images/icon.ico" />
<meta itemprop="image" content="./assets/images/icon.png" />
<link rel="stylesheet" href="./assets/css/reset.css">
<script href='./assets/rem.js'></script>

<!--inline code-->
<link rel="stylesheet" href="./assets/css/reset.css?_inline">
<script href='./assets/rem.js?_inline'></script>
```

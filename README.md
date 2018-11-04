# html-inline-assets-loader

 自动处理html文件中的相对引用css/js文件，直接内联到html文件中，或者自动编译并拷贝到dist目录
 
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

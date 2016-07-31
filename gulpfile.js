'use strict';

var gulp = require('gulp');
var livereload = require('gulp-livereload');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var stylus = require('gulp-stylus');
var autoprefixer = require('gulp-autoprefixer');
var lazypipe = require('lazypipe');
var concat = require('gulp-concat');
var order = require('gulp-order');
var connect = require('gulp-connect');

var paths = {
  js: [
  './src/**/*.js',
  '!./src/bower_components/**'
  ],
  styl: [
  './src/**/*.styl',
  '!./src/bower_components/**'
  ],
  html: [
  './src/**/*.html',
  '!./src/bower_components/**'
  ],
  index: './src/index.html'
};

// STYLUS

var stylusPipe = lazypipe()
.pipe(stylus, {
  compress: true
})
.pipe(autoprefixer, {
  browsers: [
  'last 2 versions',
  'Explorer >= 10',
  'Safari >= 6'
  ],
  cascade: false
})
.pipe(concat, 'app.css');

gulp.task('stylus', function() {
  return gulp
  .src(paths.styl)
  .pipe(stylusPipe())
  .pipe(gulp.dest('./src/.tmp/'));
});

// INJECT

var inject = require('gulp-inject');
var bowerFiles = require('main-bower-files');

gulp.task('inject', ['inject:js']);

gulp.task('inject:js', function() {

  var fileOrder = [
  '**/angular.js',
  '**/*.module.js'
  ];

  var sources = gulp.src(paths.js, {
    read: false,
    relative: true
  }, {
    relative: true
  }).pipe(order(fileOrder));

  gulp.src(paths.index)
  .pipe(inject(
    gulp.src(bowerFiles(), {read: false})
    .pipe(order(fileOrder)), {
      addRootSlash: false,
      relative: true,
      name: 'bower'
    }))
  .pipe(inject(sources, {
    addRootSlash: false,
    relative: true
  }))
  .pipe(gulp.dest('./src'));
});

// Sort files alphabetically (.module.js files have higher priority)
var injectSort = {
  comparator: function(a, b) {
    var suffix = '.module.js';

    var aIsModule = a.path.substr(-suffix.length) === suffix;
    var bIsModule = b.path.substr(-suffix.length) === suffix;

    if (aIsModule && !bIsModule) {
      return -1;
    }
    if (!aIsModule && bIsModule) {
      return 1;
    }

    if (a.path < b.path) {
      return -1;
    }
    if (a.path > b.path) {
      return 1;
    }
    return 0;
  }
};

// SERVE

gulp.task('serve', ['inject', 'stylus', 'server', 'watch']);

gulp.task('default', ['serve']);

// SERVER

gulp.task('server', function() {
  connect.server({
    root: './src',
    livereload: true
  });
});

// WATCH

var watch = require('gulp-watch');

var plumber = require('gulp-plumber');

gulp.task('watch', function() {

  // STYL
  watch(paths.styl, function() {
    gulp
    .src(paths.styl)
    .pipe(plumber())
    .pipe(stylusPipe())
    .pipe(gulp.dest('./src/.tmp/'))
    .pipe(connect.reload());
  });

  // JS:CLIENT
  watch(paths.js)
  .pipe(connect.reload());

  // HTML
  watch(paths.html)
  .pipe(connect.reload());

});

// CODE VALIDATION / STYLING

gulp.task('jshint', function() {
  return gulp.src(paths.js)
  .pipe(jshint())
  .pipe(jshint.reporter('default'));
});

gulp.task('jscs', function() {
  return gulp.src(paths.js)
  .pipe(jscs())
  .pipe(jscs.reporter());
});

gulp.task('lint', ['jshint', 'jscs']);

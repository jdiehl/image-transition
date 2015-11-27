/*eslint strict: [2, "global"]*/
/*eslint-env node*/
'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');
var rename = require('gulp-rename');

// clean
var del = require('del');

// linting
var eslint = require('gulp-eslint');

// less
var lessImport = require('gulp-less-import');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var cssmin = require('gulp-minify-css');

// javascript
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');

// inject

// lint
gulp.task('lint', function () {
  return gulp.src(['gulpfile.js', 'src/**/*.js'])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

// clean
gulp.task('clean', function (done) {
  del(['image-transition.js', 'image-transition.css', 'image-transition.min.js', 'image-transition.min.css'], done);
});

// less
gulp.task('less', function () {
  return gulp.src(['src/**/*.less'])
  .pipe(lessImport('image-transition.less'))
  .pipe(less())
  .pipe(autoprefixer())
  .pipe(gulp.dest('.'))
  .pipe(rename('image-transition.min.css'))
  .pipe(cssmin({ keepSpecialComments: 0 }))
  .pipe(gulp.dest('.'));
});

// javascript
gulp.task('js', function () {
  return gulp.src(['src/**/*.js'])
  .pipe(concat('image-transition.js'))
  .pipe(gulp.dest('.'))
  .pipe(rename('image-transition.min.js'))
  .pipe(stripDebug())
  .pipe(uglify())
  .pipe(gulp.dest('.'));
});

gulp.task('test', ['lint']);
gulp.task('default', function (done) {
  runSequence('clean', 'less', 'js', done);
});

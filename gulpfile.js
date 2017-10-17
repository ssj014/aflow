var gulp = require('gulp');
var sass = require('gulp-sass'); //sass的编译
var browserSync = require('browser-sync'); //实时刷新
var sourcemaps = require('gulp-sourcemaps'); //用于错误查找
var autoprefixer = require('autoprefixer'); //处理浏览器私有前缀
var useref = require('gulp-useref'); //根据注释将HTML中需要合并压缩的区块找出来，对区块内的所有文件进行合并
var uglify = require('gulp-uglify'); //压缩js
var gulpIf = require('gulp-if'); //条件判断
var cssnano = require('gulp-cssnano'); //压缩css
var imagemin = require('gulp-imagemin'); //图片压缩
var cache = require('gulp-cache'); //清除缓存
var del = require('del'); //删除文件
var runSequence = require('run-sequence'); //顺序执行
var contentIncluder = require('gulp-content-includer'); //通过includer导入方式导入不同的模块
var concat = require('gulp-concat'); //合并文件
var zip = require('gulp-zip'); //打zip包
var spritesmith = require('gulp.spritesmith');
var connect = require('gulp-connect');

//px转换rem
var postcss = require('gulp-postcss');
var px2rem = require('postcss-px2rem');
var processors = [px2rem({ remUnit: 64 })];
//var processors = [px2rem({ remUnit: 75 })]; //转换rem插件，默认设计稿750px

//8000端口
gulp.task('webserver', function() {
    connect.server({
        port: 8000,
    });
});

//启动本地服务器默认3000端口
gulp.task('browserSync', function() {
    browserSync.init({
        server: {
            baseDir: 'build',
        }
    })
});

//监听html/js/css文件发生改变
gulp.task('watch', function() {
    gulp.watch('src/scss/*.scss', ['wapsass']);
    gulp.watch('src/scss/*.scss', ['websass']);
    gulp.watch('src/*.html', ['html-include']);
    gulp.watch('src/images/**/*', ['copyimg']);
    gulp.watch('src/js/**/*', ['copyjs']);
});

//页面模版引入
gulp.task('html-include', function() {
    return gulp.src('src/*.html')
        .pipe(contentIncluder({
            includerReg: /<!\-\-include\s+"([^"]+)"\-\->/g
        }))
        .pipe(gulp.dest('build'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

//wapsass编译
gulp.task('wapsass', function() {
    return gulp.src('src/scss/wap.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('wap.css'))
        .pipe(postcss(processors)) //rem
        .pipe(gulp.dest('build/css'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

//webcss编译
gulp.task('websass', function() {
    return gulp.src('src/scss/web.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('web.css'))
        .pipe(gulp.dest('build/css'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

//合并压缩css
gulp.task('css', function() {
    return gulp.src('build/css/*.css')
        .pipe(postcss([autoprefixer()]))
        .pipe(cssnano())
        .pipe(gulp.dest('dist/css'));
});

//合并html
gulp.task('html', function() {
    return gulp.src('build/*.html')
        .pipe(gulp.dest('dist'));
});

//合并压缩html文件中的css/js
gulp.task('useref', function() {
    return gulp.src('src/*.html')
        .pipe(useref())
        .pipe(gulpIf('*.js', uglify()))
        .pipe(gulpIf('*.css', postcss([autoprefixer()])))
        .pipe(gulpIf('*.css', cssnano()))
        .pipe(gulp.dest('dist'));
});

//压缩图片
gulp.task('images', function() {
    return gulp.src('src/images/**/*.+(png|jpg|jpeg|gif|svg)')
        // 清除图片缓存
        .pipe(cache(imagemin({
            interlaced: true,
        })))
        .pipe(gulp.dest('dist/images'))
});

//复制js到指定文件夹 
gulp.task('copyjs', function() {
    return gulp.src(['src/js/**/*'])
        .pipe(gulp.dest('build/js'))
        .pipe(browserSync.reload({
            stream: true
        }));
});
gulp.task('js', function() {
    return gulp.src('src/js/**/*')
        .pipe(gulp.dest('dist/js'))
});

//复制images指定文件夹
gulp.task('copyimg', function() {
    return gulp.src('src/images/**/*')
        .pipe(gulp.dest('build/images'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

//每次build清除dist文件夹 
gulp.task('clean', function() {
    return del.sync('dist').then(function(cb) {
        return cache.clearAll(cb);
    });
});
gulp.task('clean:dist', function() {
    return del.sync(['dist/**/*', '!dist/*.zip', '!dist/images', '!dist/images/**/*']);
});

//打包html文件夹并按照时间重命名压缩包
gulp.task('zip', function() {
    function checkTime(i) {
        if (i < 10) { i = '0' + i; }
        return i;
    }
    var d = new Date();
    var year = d.getFullYear();
    var month = checkTime(d.getMonth() + 1);
    var day = checkTime(d.getDate());
    var hour = checkTime(d.getHours());
    var minute = checkTime(d.getMinutes());
    var second = checkTime(d.getSeconds());

    var time = String(year) + String(month) + String(day) + String(hour) + String(minute) + String(second);
    var project = 'project-' + time + '.zip';

    return gulp.src('./dist/**/*')
        .pipe(zip(project))
        .pipe(gulp.dest('dist'))
});

//gulp init初始化项目
gulp.task('init', ['wapsass', 'websass', 'copyjs', 'copyimg', 'html-include'], function() {
    return (gulp.dest('build'))
});

//默认任务
gulp.task('default', ['browserSync', 'webserver', 'watch', 'init']);

//编译压缩打包
gulp.task('build', function(callback) {
    runSequence(
        'clean:dist',
        'wapsass', 'websass', ['useref', 'images', 'js', 'css', 'html'], 'zip',
        callback
    )
});
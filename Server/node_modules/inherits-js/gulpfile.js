var gulp = require("gulp");

gulp.task("compile", function() {
    var browserify = require("browserify"),
        buffer     = require("vinyl-buffer"),
        source     = require("vinyl-source-stream"),

        bundler;

    bundler = browserify("./src/inherits.js");

    return bundler.bundle({standalone: 'noscope'})
        .pipe(source('inherits.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist'));
});

gulp.task("wrap", function() {
    var wrap = require("gulp-wrap");

    return gulp.src("./dist/inherits.js")
        .pipe(wrap({ src: "./build/wrapper.ejs" }))
        .pipe(gulp.dest("./dist"));
});

gulp.task("uglify", function() {
    var uglify = require("gulp-uglify"),
        rename = require("gulp-rename");

    return gulp.src("./dist/inherits.js")
        .pipe(uglify())
        .pipe(rename("inherits.min.js"))
        .pipe(gulp.dest("./dist"));
});

gulp.task("clean", function() {
    var clean = require("gulp-clean");

    return gulp.src("./dist", { read: false })
        .pipe(clean());
});

gulp.task("dist", function() {
    var wrap   = require("gulp-wrap"),
        format = require("dateformat"),
        fs     = require("fs"),
        now, data;

    now = new Date();

    data = {
        now: format(now, "yyyy-mm-dd HH:MM:ss"),
        year: format(now, "yyyy"),
        pkg: JSON.parse(fs.readFileSync("./package.json"))
    };

    return gulp.src("./dist/**.js")
        .pipe(wrap({ src: "./build/banner.ejs" }, data, { variable: 'data' }))
        .pipe(gulp.dest("./dist"));
});

gulp.task("default", function(done) {
    var runSequence = require("run-sequence");

    runSequence(
        "clean",
        "compile",
        "wrap",
        "uglify",
        "dist",
        done);
});
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            js: {
                src: [  
                    'src/*.js'
                ],
                dest: 'dist/leaflet.geofencer.js'
            }
        },
        uglify: {
            js: {
                files: {
                    'dist/leaflet.geofencer.min.js': ['dist/leaflet.geofencer.js']
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['concat:js', 'uglify:js']);
}
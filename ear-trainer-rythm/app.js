'use strict';

const States = {
    NOT_INITIALIZED: -1,
    LOADING: 0,
    BEFORE_GAME: 1,
    DURING_GAME: 2
};
class App {
    // files - paths to wave files.
    constructor(files) {
        this.files_ = files;
        this.state = States.NOT_INITIALIZED;
        this.resources_to_load_ = files.length;
        this.sound_by_name_ = {};
        this.sound_names_ = [];

        this.sound1Name_ = '';
        this.sound2Name_ = '';
        this.desyncFrom_ = -1;
        this.desyncTo_ = -1;
        this.questionsAsked_ = -1;
        this.questionsCorrect_ = -1;
        this.firstSoundShift_ = -1;
        this.tries_ = -1;
        this.answerInProgress_ = false;
    }

    setState(s) {
        switch (s) {
        case States.LOADING: {
            this.goLoading(); break;
        }
        case States.BEFORE_GAME: {
            this.goBeforeGame(); break;
        }
        case States.DURING_GAME: {
            this.startGame(); break;
        }
        }
        this.state = s;
    }

    goLoading() {
        $('#content').html(
            '<img src="../files/loading_2.gif"></img>');
        let app = this;
        for (var i = 0; i < this.files_.length; i++) {
            let filename = this.files_[i];
            let sound = new Tone.Player(filename, function() {
                var sound_name = app.shortNameFromFilename(filename);
                app.sound_by_name_[sound_name] = sound;
                app.sound_names_.push(sound_name);
                app.resources_to_load_ -= 1;
                if (app.resources_to_load_ == 0) {
                    app.setState(States.BEFORE_GAME);
                }
            }).toMaster();
            sound.autostart = false;
        }
    }

    goBeforeGame() {
        $('#content').empty();
        this.explainRules();
        this.makeBeforeGameControls();
        this.addDisclaimer();
    }

    explainRules() {
        $('#content').append(
            '<p>This is a game to test and develop your sense of rythm<br>'
        );
    }

    makeBeforeGameControls() {
        var slider = $('<div id="desync-range"></div>').slider({
            range: true,
            min: 10,
            max: 1000,
            step: 10,
            values: [500, 700],
            slide: function( event, ui ) {
                $('#desync-range-message').html('Interval between sounds: ' + ui.values[0] + 'ms - ' + ui.values[1] + 'ms');
            }
        });

        var options = '';
        for (var i = 0; i < this.sound_names_.length; i++) {
            var sound_name = this.sound_names_[i];
            options += ('<option value="' + sound_name + '">' + sound_name + '</option>');
        }
        var select1 = $('<label for="select-sound-1">Sound 1: </label><select id="select-sound-1">' + options + '</select>');
        var select2 = $('<label for="select-sound-2">Sound 2: </label><select id="select-sound-2">' + options + '</select>');


        $('#content').append(select1).append('<br>').append(select2);
        $('#select-sound-1').val('guitar');
        $('#select-sound-2').val('kick');

        $('#content').append('<div id="desync-range-message"></div>').append(slider);
        $('#desync-range-message').html('Interval between sounds: ' + $('#desync-range').slider('values', 0) +
                                        'ms - ' + $('#desync-range').slider('values', 1) + 'ms');

        $('#select-sound-1').selectmenu();
        $('#select-sound-2').selectmenu();
        $('#content').append('<br><button id="button-start" style="width:150px; height: 50px">Start</button>');
        var app = this;
        $('#button-start').click(function() {
            app.maybeStart();
        });
        $('#content').append('<div id="try-text">Select parameters and click [start]</div>')
    }

    addDisclaimer() {
        $('#content').append(
            '<hr>' +
                'This application used this freely available resources:<br>' +
                'https://freewavesamples.com/bass-drum-2<br>' +
                'https://freewavesamples.com/roland-sc-88-distorted-guitar-c3<br>' +
                'https://freewavesamples.com/korg-ns5r-power-snare<br>' +
                'https://commons.wikimedia.org/wiki/File:Loading_2.gif<br>');
        this.addIndexLink();
    }

    startGame() {
        $('#content').empty();
        this.questionsAsked_ = 0;
        this.questionsCorrect_ = 0;
        this.addAnswerButtons();
        this.addReplayButton();
        this.addAskedAnsweredSection();
        this.addIndexLink();
        this.questionLoop();
    }

    addIndexLink() {
        $('#content').append('<p><a href="/">Back to main page</a>' +
                             '<p>&copy; Copyright 2020, Iaroslav Tymchenko')
    }

    questionLoop() {
        this.tries_ = 0;
        this.enableAnswerButtons();
        this.makeQuestion();
        this.playSounds();
        this.updateAskedAnsweredSection();
    }

    enableAnswerButtons() {
        $('#s1-then-s2').css({'color': 'black'});
        $('#s2-then-s1').css({'color': 'black'});
        $('#same-time').css({'color': 'black'});
    }

    updateAskedAnsweredSection() {
        $('#asked-answered').html(this.questionsCorrect_ + ' / ' + this.questionsAsked_);
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    playSounds() {
        var app = this;
        setTimeout(function() {
            app.sound_by_name_[app.sound1Name_].start();
        }, 1000 + this.firstSoundShift_);
        setTimeout(function() {
            app.sound_by_name_[app.sound2Name_].start();
        }, 1000);
    }

    addAnswerButtons() {
        $('#content').append('<button id="s1-then-s2"></button>');
        var app = this;
        $('#s1-then-s2').html('First ' + this.sound1Name_ + ', then ' + this.sound2Name_);
        $('#s1-then-s2').click(function() {
            app.answer('s1-then-s2');
        });

        $('#content').append('<button id="same-time"></button>');
        $('#same-time').click(function() {
            app.answer('same-time');
        });
        $('#same-time').html('Simultaneously');

        $('#content').append('<button id="s2-then-s1"></button>');
        $('#s2-then-s1').html('First ' + this.sound2Name_ + ', then ' + this.sound1Name_);
        $('#s2-then-s1').click(function() {
            app.answer('s2-then-s1');
        });
    }

    isCorrectAnswer(answerId) {
        if ((answerId == 's1-then-s2') && (this.firstSoundShift_ < 0)) return true;
        if ((answerId == 's2-then-s1') && (this.firstSoundShift_ > 0)) return true;
        if ((answerId == 'same-time') && (this.firstSoundShift_ == 0)) return true;
        return false;
    }

    answer(answerId) {
        var app = this;
        if (app.answerInProgress_) return;

        app.answerInProgress_ = true;
        var correct = app.isCorrectAnswer(answerId);
        $('#' + answerId).animate({'color': correct ? 'green' : 'red'}, 500, function() {
            app.answerInProgress_ = false;
            if (correct) {
                if (app.tries_ == 0) {
                    app.questionsCorrect_ += 1;
                }
                setTimeout(function() { app.questionLoop(); }, 1);
                return;
            } else {
                app.tries_ += 1;
                app.playSounds();
            }
        });
    }

    addReplayButton() {
        $('#content').append('<br><button id="replay">Replay</button>');
        var app = this;
        $('#replay').click(function() {
            app.playSounds();
        });
    }

    addAskedAnsweredSection() {
        $('#content').append('<div id="asked-answered"></div>');
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    makeQuestion() {
        this.questionsAsked_ += 1;
        this.tries_ = 0;
        var r = this.getRandomInt(0, 3);
        if (r == 0) {
            this.firstSoundShift_ = 0;
            return;
        }
        var shift = this.getRandomInt(this.desyncFrom_, this.desyncTo_ + 1);
        if (r == 1) {
            this.firstSoundShift_ = shift;
        }
        if (r == 2) {
            this.firstSoundShift_ = -shift;
        }
    }

    shortNameFromFilename(filename) {
        var parts = filename.split('/');
        var part = parts[parts.length - 1];
        var baseext = part.split('.');
        return baseext[0];
    }

    maybeStart() {
        var sound1 = $('#select-sound-1').val();
        var sound2 = $('#select-sound-2').val();
        if (sound1 == sound2) {
            $('#try-text').html('Please make sure to choose different sounds and click [start]')
            return;
        }
        this.sound1Name_ = sound1;
        this.sound2Name_ = sound2;
        this.desyncFrom_ = $('#desync-range').slider('values', 0);
        this.desyncTo_ = $('#desync-range').slider('values', 1);
        this.setState(States.DURING_GAME);
    }
};

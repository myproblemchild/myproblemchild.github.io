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
        this.state_ = States.NOT_INITIALIZED;
        this.resources_to_load_ = files.length;
        this.sound_by_name_ = {};
        this.sound_names_ = [];

        this.sound1_name_ = '';
        this.sound2_name_ = '';
        this.from_ms_ = -1;
        this.to_ms_ = -1;

        this.questions_asked_ = -1;
        this.questions_correct_ = -1;
        this.first_sound_shift_ = -1;
        this.tries_ = -1;
        this.answer_in_progress_ = false;

        this.elements_created_ = false;
    }

    maybeCreateElements() {
        if (this.elements_created_) return;
        this.elements_created_ = true;
        var app = this;

        var options = '';
        for (var i = 0; i < app.sound_names_.length; i++) {
            var sound_name = app.sound_names_[i];
            options += app.makeOption(sound_name);
        }
        app.ui_select1_ = app.makeSelect('select-sound-1', 'Sound 1', options);
        app.ui_select2_ = app.makeSelect('select-sound-2', 'Sound 2', options);

        app.ui_input_shift_from_ = app.makeInputNumber('shift-from', 10, 1000, 200);
        app.ui_input_shift_to_ = app.makeInputNumber('shift-to', 10, 1000, 500);

        app.ui_button_start_ = $('<button id="button-start" style="font-size: 24">Start</button>');
        $(app.ui_button_start_).click(function() {
            app.maybeStart();
        });

        app.ui_button_restart_ = $('<button style="font-size: 24">Restart</button>');
        $(app.ui_button_restart_).click(function() {
            location.reload(true);
        });

        app.ui_div_instructions_ = $('<div id="instructions">Select parameters and click [start]</div>');

        app.ui_answer_s1_then_s2_ = $('<button id="s1-then-s2" style="font-size: 24"></button>');
        app.ui_answer_s2_then_s1_ = $('<button id="s2-then-s1" style="font-size: 24"></button>');
        app.ui_answer_same_time_ = $('<button id="same-time" style="font-size: 24"></button>');
        $(app.ui_answer_s1_then_s2_).click(function() {
            app.answer('s1-then-s2', app.ui_answer_s1_then_s2_);
        });
        $(app.ui_answer_s2_then_s1_).click(function() {
            app.answer('s2-then-s1', app.ui_answer_s2_then_s1_);
        });
        $(app.ui_answer_same_time_).click(function() {
            app.answer('same-time', app.ui_answer_same_time_);
        });

        app.ui_replay_ = $('<button id="replay" style="font-size: 24">Replay</button>');
        $(app.ui_replay_).click(function() {
            app.playSounds();
        });

        app.ui_rules_ = $('<p>This is a game to test and develop your sense of rythm');
        app.ui_disclaimer_ = $(
            '<div id="disclaimer">' +
                'This application used these freely available resources:<br>' +
                'https://freewavesamples.com/bass-drum-2<br>' +
                'https://freewavesamples.com/roland-sc-88-distorted-guitar-c3<br>' +
                'https://freewavesamples.com/korg-ns5r-power-snare<br>' +
                'https://commons.wikimedia.org/wiki/File:Loading_2.gif<br>' +
                'https://freewavesamples.com/casio-mt-45-bass-i-c2<br>' +
                'https://freewavesamples.com/casio-vz-10m-soft-glass-c4<br>' + 
                'https://tonejs.github.io/ - ToneJS library for sound manipulation<br>' +
                'jQuery library</div>');

        app.ui_chosen_range_ = $('<div></div>');
        app.ui_asked_answered_ = $('<div style="font-size: 24"></div>');
    }

    setAnswerButtonsTextAndChosenRangeText() {
        $(this.ui_answer_s1_then_s2_).html('First ' + this.sound1_name_ + ', then ' + this.sound2_name_);
        $(this.ui_answer_s2_then_s1_).html('First ' + this.sound2_name_ + ', then ' + this.sound1_name_);
        $(this.ui_answer_same_time_).html('Same time');
        $(this.ui_chosen_range_).html(`Chosen range: from ${this.from_ms_}ms to ${this.to_ms_}ms`);
    }

    makeInputNumber(id, min, max, val) {
        return $(`<input type='number' id='${id}' ` +
                 `name='${id}' min='${min}' max='${max}' value='${val}'>`);
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
        this.state_ = s;
    }

    goLoading() {
        $('#content').html(
            '<img src="../files/loading.gif"></img>');
        let app = this;
        for (var i = 0; i < this.files_.length; i++) {
            let filename = this.files_[i];
            let sound = new Tone.Player(filename, function() {
                var sound_name = app.shortNameFromFilename(filename);
                app.sound_by_name_[sound_name] = sound;
                app.sound_names_.push(sound_name);
                app.resources_to_load_ -= 1;
                if (app.resources_to_load_ == 0) {
                    app.sound_names_.sort();
                    app.setState(States.BEFORE_GAME);
                }
            }).toMaster();
            sound.autostart = false;
        }
    }

    goBeforeGame() {
        this.maybeCreateElements();
        this.showBeforeGameControls();
    }

    makeOption(optionValue) {
        return `<option value="${optionValue}">${optionValue}</option>`;
    }

    makeSelect(selectId, title, options) {
        return $(`<select id="${selectId}">${options}</select>`);
    }

    showBeforeGameControls() {
        $('#content').empty();
        $('#content').
            append(this.ui_rules_).
            append('<br>').
            append('Sound 1: ').
            append(this.ui_select1_).
            append('<br>').
            append('Sound 2: ').
            append(this.ui_select2_).
            append('<br>').
            append('Time range ms, from: ').
            append(this.ui_input_shift_from_).
            append('<br>').
            append('Time range ms, to: ').
            append(this.ui_input_shift_to_).
            append('<br>').
            append(this.ui_button_start_).
            append('<br>').
            append(this.ui_div_instructions_).
            append('<br>').
            append('<br>').
            append('<hr>').
            append('<br>').
            append('<br>').
            append(this.ui_disclaimer_);

        $(this.ui_select1_).val('guitar');
        $(this.ui_select2_).val('kick');
    }

    startGame() {
        $('#content').empty();
        this.questions_asked_ = 0;
        this.questions_correct_ = 0;

        this.setAnswerButtonsTextAndChosenRangeText();

        $('#content').
            append(this.ui_chosen_range_).
            append('<br>').
            append(this.ui_answer_s1_then_s2_).
            append(this.ui_answer_same_time_).
            append(this.ui_answer_s2_then_s1_).
            append('<br>').
            append(this.ui_replay_).
            append('<br>').
            append('<br>').
            append(this.ui_asked_answered_).
            append('<br>').
            append('<br>').
            append(this.ui_button_restart_).
            append('<hr>').
            append(this.ui_disclaimer_);

        this.questionLoop();
    }

    questionLoop() {
        this.tries_ = 0;
        this.clearAnswerButtons();
        this.makeQuestion();
        this.playSounds();
        // -1 - don't count toward wrong answers yets.
        this.updateAskedAnsweredSection(0, -1);
    }

    clearAnswerButtons() {
        $(this.ui_answer_s1_then_s2_).css({'color': 'black'});
        $(this.ui_answer_s2_then_s1_).css({'color': 'black'});
        $(this.ui_answer_same_time_).css({'color': 'black'});
    }

    updateAskedAnsweredSection(delta_correct, delta_wrong) {
        var correct = this.questions_correct_ + delta_correct;
        var wrong = this.questions_asked_ - this.questions_correct_ + delta_wrong;
        $(this.ui_asked_answered_).html(
            `Asked questions: ${this.questions_asked_}<br>` +
                `Correct answers: <font color='green'>${correct}</font><br>` +
                `Wrong answers: <font color='red'>${wrong}</font>`
        );
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    playSounds() {
        var app = this;
        setTimeout(function() {
            app.sound_by_name_[app.sound1_name_].start();
        }, 1000 + this.first_sound_shift_);
        setTimeout(function() {
            app.sound_by_name_[app.sound2_name_].start();
        }, 1000);
    }

    isCorrectAnswer(answerId) {
        if ((answerId == 's1-then-s2') && (this.first_sound_shift_ < 0)) return true;
        if ((answerId == 's2-then-s1') && (this.first_sound_shift_ > 0)) return true;
        if ((answerId == 'same-time') && (this.first_sound_shift_ == 0)) return true;
        return false;
    }

    answer(answer_id, answer_element) {
        var app = this;
        if (app.answer_in_progress_) return;
        app.answer_in_progress_ = true;
        var correct = app.isCorrectAnswer(answer_id);

        var delta_correct = 0;
        var delta_wrong = 0;
        if (correct && !app.tries_) {
            delta_correct = 1;
            delta_wrong = -1;
        }
        this.updateAskedAnsweredSection(delta_correct, delta_wrong);
        $(answer_element).css({'color': correct ? 'green' : 'red'});
        setTimeout(function() {
            app.answer_in_progress_ = false;
            if (correct) {
                if (app.tries_ == 0) {
                    app.questions_correct_ += 1;
                }
                setTimeout(function() { app.questionLoop(); }, 1);
                return;
            } else {
                app.tries_ += 1;
                app.playSounds();
            }
        }, 500);
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    makeQuestion() {
        this.questions_asked_ += 1;
        this.tries_ = 0;
        var r = this.getRandomInt(0, 3);
        if (r == 0) {
            this.first_sound_shift_ = 0;
            return;
        }
        var shift = this.getRandomInt(this.from_ms_, this.to_ms_ + 1);
        if (r == 1) {
            this.first_sound_shift_ = shift;
        }
        if (r == 2) {
            this.first_sound_shift_ = -shift;
        }
    }

    shortNameFromFilename(filename) {
        var parts = filename.split('/');
        var part = parts[parts.length - 1];
        var baseext = part.split('.');
        return baseext[0];
    }

    maybeStart() {
        var sound1 = $(this.ui_select1_).val();
        var sound2 = $(this.ui_select2_).val();
        if (sound1 == sound2) {
            $(this.ui_div_instructions_).html('Please make sure to choose different sounds and click [start]');
            return;
        }
        this.sound1_name_ = sound1;
        this.sound2_name_ = sound2;

        var from_ms = parseInt($(this.ui_input_shift_from_).val());
        var to_ms = parseInt($(this.ui_input_shift_to_).val());
        if (!((10 <= from_ms) && (from_ms <= to_ms) && (to_ms <= 1000))) {
            $(this.ui_div_instructions_).html(
                'Please make sure to enter correct range ' +
                    '(10 <= from <= to <= 1000) and click [start]');
            return;
        }

        this.from_ms_ = from_ms;
        this.to_ms_ = to_ms;

        this.setState(States.DURING_GAME);
    }
};

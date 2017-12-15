var mongoose = require('mongoose');
var Schema = mongoose.Schema

var mark_menuSchema = new Schema({
    username: String,
    password: String,
    title: String,
    tel: String,
    juso: String,
    contents: [{
        menu: String,
        price: String
    }],
    comments: [{
        name: String,
        memo: String,
        date: {type: Date, default: Date.now}
    }],
    count: {type:Number, default: 0},
    date: {type: Date, default: Date.now},
    updated: [{contents: String, date:{type: Date, default: Date.now}}],
    deleted: {type: Boolean, default: false}, // true면 삭제 된 경우임
    fileUp:[String] //파일의 주소
});
module.exports =  mongoose.model('mark_menu', mark_menuSchema);
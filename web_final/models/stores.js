var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var storeSchema = new Schema({
    title: String,
    writer: String,
    open: String,
    close: String,
    tel: String,
    juso: String,
    menu: [String],
    price: [String],
    comments:[{
        name: String,
        memo: String,
        date: {type: Date, default: Date.now},
        images:[String]
    }],
    date: {type: Date, default: Date.now},
    description: String,
    password: String,
    count: {type:Number, default: 0},
    fileUp:[String], // 업로드 된 파일 저장된 주소
    reserve:[{
        reserver: String,
        reservertel: String,
        reservermemo: String,
        reservetime: String
    }]
});


module.exports = mongoose.model('stores', storeSchema);
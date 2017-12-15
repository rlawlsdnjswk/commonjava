var express = require('express');
var router = express.Router();
var Store = require('../models/stores'); //db에 저장,불러오는데 이용
var User = require('../models/users');
var crypto = require('crypto');//암호화 모듈
var fs = require('fs');
var multer = require('multer'); // 파일 저장을 위한  multer
var upload = multer({dest:'./public/images/storeimage'}); // multer 경로 설정, 파일이 업로드 되면 먼저 임시 폴더에 저장됨
var passport = require('passport');




//파일 저장 확인
function isSaved(upFile) {
    // 파일 저장 여부 확인해서 제대로 저장되면 디비에 저장되는 방식
    var savedFile = upFile;
    var count = 0;
    if(savedFile != null) { // 파일 존재시 -> tmp폴더에 파일 저장여부 확인 -> 있으면 저장, 없으면 에러메시지
        for (var i = 0; i < savedFile.length; i++) {
            if(fs.statSync(getDirname(1) + savedFile[i].path).isFile()){ //fs 모듈을 사용해서 파일의 존재 여부를 확인한다.
                count ++; // true인 결과 갯수 세서
            };
        }
        if(count == savedFile.length){  //올린 파일 갯수랑 같으면 패스
            return true;
        }else{ // 파일이 다를 경우 false를 리턴함.
            return false;
        }
    }else{ // 파일이 처음부터 없는 경우
        return true;
    }
}

function getDirname(num){
    //원하는 상위폴더까지 리턴해줌. 0은 현재 위치까지, 1은 그 상위.. 이런 식으로
    // 리네임과, 파일의 경로를 따오기 위해 필요함.
    var order = num;
    var dirname = __dirname.split('/');
    var result = '';
    for(var i=0;i<dirname.length-order;i++){
        result += dirname[i] + '/';
    }
    return result;
}
// 업로드시 파일 리네임
 function renameUploadFile(itemId,upFile){
    
    var renameForUpload = {};
    var newFile = upFile; // 새로 들어 온 파일
    var tmpPath = [];
    var tmpType = [];
    var index = [];
    var rename = [];
    var fileName = [];
    var fullName = []; // 다운로드 시 보여줄 이름 필요하니까 원래 이름까지 같이 저장하자!
    var fsName = [];
    for (var i = 0; i < newFile.length; i++) {
        tmpPath[i] = newFile[i].path;
        tmpType[i] = newFile[i].mimetype.split('/')[1]; // 확장자 저장해주려고!
        index[i] = tmpPath[i].split('/').length;
        rename[i] = tmpPath[i].split('/')[index[i] - 1];
        fileName [i] = itemId + "_" + getFileDate(new Date()) + "_" + rename[i] + "." + tmpType[i]; // 파일 확장자 명까지 같이 가는 이름 "글아이디_날짜_파일명.확장자"
        fullName [i] = fileName[i] + ":" + newFile[i].originalname.split('.')[0]; // 원래 이름까지 같이 가는 이름 "글아이디_날짜_파일명.확장자:보여줄 이름"
        fsName [i] = "/images/storeimage/"+rename[i].split('\\')[3]; // fs.rename 용 이름 "./upload/글아이디_날짜_파일명.확장자"
    }
    renameForUpload.tmpname = tmpPath;
    renameForUpload.filename = fileName;
    renameForUpload.fullname = fullName;
    renameForUpload.fsname = fsName;
    return renameForUpload;
}

function getFileDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var fullDate = year+""+month+""+day+""+hour+""+min+""+sec;
    return fullDate
}
//로그인 확인함수
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    } else {
        res.redirect('login');
    }
}
/* GET home page. */
//메인페이지
router.get('/', function(req, res) {
    res.render('main', { title: 'MatZip go', user: req.user});
});
//개인정보
router.get('/profile', function(req, res) {
    console.log(req.user.username);
    console.log(req.user.tel);
    console.log(req.user.reserve);


    res.render('profile', { title: 'MatZip go', user: req.user});
});

//임시 맛집등록
router.get('/mark_registeration', isLoggedIn, function(req, res) {
  res.render('mark_registeration', { title: 'MatZip go' , user: req.user});
});
//게시판
router.get('/mark_menu', function(req, res) {
    var page = req.param('page');
    if(page == null) {page = 1;}
    var skipSize = (page-1)*5;
    var limitSize = 5;
    var pageNum = 1;
    
        Store.count({},function(err, totalCount){
       
        if(err) throw err;    
        pageNum = Math.ceil(totalCount/limitSize); //페이지 숫자

        Store.find({}).sort({count:-1}).skip(skipSize).limit(limitSize).exec(function(err, rawContents){
       // 한페이지에 limitSize만큼, db에서 조회수 순으로 데이터들을  각 페이지는 skipSize만큼 스킵되서 순서대로 정렬
        if(err) throw err;
      
        res.render('mark_menu', {title: "맛집 탐방", contents: rawContents, pagination: pageNum, user: req.user}); 
        // contents변수엔 db 검색 결과 json 데이터를 저장해줌.
        });
    });
});
//게시판 검색
router.get('/search', function(req, res){
    var page = req.param('page');
    if(page == null) {page = 1;}
    var skipSize = (page-1)*5;
    var limitSize = 5;
    var pageNum = 1;
    var search_word = req.param('searchWord');
    var searchCondition = {$regex:search_word};
    
            Store.count({$or:[{title:searchCondition},{contents:searchCondition},{writer:searchCondition}]}, function(err, totalCount){
             
            if(err) throw err;
            pageNum = Math.ceil(totalCount/limitSize); //페이지 숫자


            Store.find({$or:[{title:searchCondition},{contents:searchCondition},{writer:searchCondition}]}).sort({count:-1}).exec(function(err, searchContents){
            if(err) throw err;
                
            res.render('mark_menu', {title: "맛집 탐방", contents: searchContents, pagination: pageNum, user: req.user});
        });
    });
});
//게시판 상세
router.get('/mark_menu_detail', function(req, res) {
      var contentId = req.param('id');
    Store.findOne({_id:contentId}, function(err, rawContent){
        if(err) throw err;
        var reply_pg = Math.ceil(rawContent.comments.length/5);//해당 글의 댓글 페이지수
        rawContent.count += 1; // 조회수를 늘려줍니다.
        rawContent.save(function(err){ // 변화된 조횟수 저장
            if(err) throw err;
            res.render('mark_menu_detail',{title: "맛집 GO", content:rawContent, replyPage: reply_pg, user: req.user}); // db에서 가져온 내용을 뷰로 렌더링
        });
    })
});
//예약
router.get('/reserve', isLoggedIn, function(req, res) {
    var contentId = req.param('id');
    var time = req.param('date');
    Store.findOne({_id:contentId}, function(err, rawContent){
        if(err) throw err;
        console.log(time);
    res.render('reserve', { title: 'MatZip go', user: req.user, date:time, content:rawContent});
    })
});
//예약 디테일
router.get('/reserve_detail', function(req, res) {
    var contentId = req.param('id');
    var d = req.param('date');
    var t = req.param('time');
    console.log(d+t);
    Store.findOne({_id:contentId}, function(err, rawContent){
        if(err) throw err;
    res.render('reserve_detail', { title: 'MatZip go', user: req.user, date: d +' '+ t, content:rawContent });
    });
});
//회원가입페이지
router.get('/user_registeration', function(req, res, next) {
  res.render('user_registeration', { title: 'Sign up' , user: req.user });
});
//로그인
router.get('/login', function(req, res) {
     if (req.isAuthenticated()){
        res.redirect('/');
    } else {
        res.render('login', { title: '로그인' });
    }
});
//로그인 완료
router.get('/login_ok', function(req, res) {
  res.render('login_ok', { title: '로그인' });
});
//로그인포스트
router.post('/login_post', passport.authenticate('login', {
    successRedirect : '/login_ok', 
    failureRedirect : '/login', //로그인 실패시 redirect할 url주소
    failureFlash : true 
}));
//로그아웃 포스트
router.get('/logout_post',function(req, res){
    req.logout();
	res.redirect('/logout_ok');
});
//로그아웃 성공
router.get('/logout_ok', function(req, res) {
  res.render('logout_ok', { title: '로그아웃' , user: req.user });
});
//예약 성공
router.get('/reserve_ok', function(req, res) {
  res.render('reserve_ok', { title: '예약성공' , user: req.user });
});
//이달의맛집
router.get('/month', function(req, res, next) {
        Store.findOne({}, function(err, rawContent){
        if(err) throw err;
        var reply_pg = Math.ceil(rawContent.comments.length/5);//해당 글의 댓글 페이지수
        rawContent.count += 1; // 조회수를 늘려줍니다.
        rawContent.save(function(err){ // 변화된 조횟수 저장
            if(err) throw err;
            res.render('mark_menu_detail',{title: "맛집 GO", content:rawContent, replyPage: reply_pg, user: req.user}); // db에서 가져온 내용을 뷰로 렌더링
        });
    }).sort({count:-1});
});
//로그아웃
router.get('/logout', function(req, res, next) {
    req.logout();
	// after logging out, stay in the current page
	res.redirect(url.parse(req.url,true).query.url);
});
//이름확인
router.get('/checkusername', function(req, res, next) {
  res.render('checkusername', { });
});
//주소팝업
router.get('/jusoPopup', function(req, res, next) {
  res.render('jusoPopup', { title: 'juso' });
});
//맛집정보 db연동
router.post('/mark_registeration_post', upload.array('UploadFile'), function(req, res){
    var addtitle = req.body.title;
    var addtel = req.body.tel;
    var addwriter = req.body.writer;
    var addjuso = req.body.juso1 + ' ' + req.body.juso2 + ' ' + req.body.juso3;
    var menulength = req.body.menu.length;
    var addopen = req.body.open;
    var addclose = req.body.close;
    var addmenu = [];
    var addprice = [];
    for(var i = 0; i<menulength; i++){
        addmenu[i] = req.body.menu[i];
        addprice[i] = req.body.price[i];
    }
    var addpassword = req.body.password;
    var adddescription = req.body.description;
    var upFile = req.files; // 업로드 된 파일을 받아옴
    
    if (isSaved(upFile)) { // 파일이 제대로 업로드 되었는지 확인 후 디비에 저장시키게 됨

        var newStore = new Store();
        newStore.title = addtitle
        newStore.tel = addtel
        newStore.open = addopen.split(':')[0]
        newStore.close = addclose.split(':')[0]
        newStore.writer = addwriter
        newStore.juso = addjuso
        for(var i = 0; i<menulength; i++){
            newStore.menu[i] = addmenu[i]
            newStore.price[i] = addprice[i]
        }
        newStore.password = addpassword
        newStore.description = adddescription
            console.log(upFile);

        newStore.save(function(err){
            if (err) throw err;
            Store.findOne({_id: newStore._id}, {_id: 1}, function (err, newStoreId) {
            if (err) throw err;
            if (upFile != null) { // 파일이 있는 경우 리네임을 해준다.
               var renaming = renameUploadFile(newStoreId.id, upFile);
                for (var i = 0; i < upFile.length; i++) {
                    fs.rename(renaming.tmpname[i], renaming.fsname[i], function (err) {
                        if (err) {
                            console.log(err);
                            console.log('!!!!!!!!!!!!!!!!!!!!!!!!'+renaming.filename);
                            return;
                        }console.log('@@@@@@@@@@@@@@@@@@@@@@@@@'+renaming.filename);
                    });
                }
                for (var i = 0; i < upFile.length; i++) { // 그리고 리네임 된 파일을 디비에 추가해줌.
                    Store.update({_id: newStoreId.id}, {$push: {fileUp: renaming.fsname[i]}}, function (err) {
                        if (err) throw err;
                    });
                }
                
            
            }
        });
    });
    res.redirect('/mark_menu');
    }else {
          console.log("파일이 저장되지 않았습니다!");
    }
});
//회원가입 포스트
router.post('/signup', passport.authenticate('signup', {
    successRedirect : '/registeration_ok', 
    failureRedirect : '/user_registeration', //가입 실패시 redirect할 url주소
    failureFlash : true 
}));

//회원가입 성공
router.get('/registeration_ok', function(req, res) {
  res.render('registeration_ok', { title: '가입완료' , user: req.user });
});

router.post('/mark_menu_detail/reply', upload.array('UploadFile'), function(req, res){
    // 댓글 다는 부분
    var reply_writer = req.body.replyWriter;
    var reply_comment = req.body.replyComment;
    var reply_id = req.body.replyId;
    var upFile = req.files; // 업로드 된 파일을 받아옴
    console.log(upFile);
    
        Store.findOne({_id: reply_id}, function(err, rawContent){
        if(err) throw err;
                  if (upFile != null) { // 파일이 있는 경우 리네임을 해준다.
               var renaming = renameUploadFile(reply_id, upFile);
                for (var i = 0; i < upFile.length; i++) {
                    fs.rename(renaming.tmpname[i], renaming.fsname[i], function (err) {
                        if (err) {                            
                            return;
                        }
                    });
                }
                console.log("@@@@@@@@@@@@@@@@@@@@@@@"+renaming.fsname[0]);
                
            
            }
        rawContent.comments.push({name: reply_writer, memo: reply_comment, images: renaming.fsname[0]});
        rawContent.save(function(err){
            if(err) throw err;      
            });
        });
     res.redirect('/mark_menu_detail?id='+reply_id);
    });


   

//예약 포스트
router.post('/reserve_post', function(req, res){
    var storeID = req.body.storeID;
    var reservestore = req.body.reservestore;
    var reservetime = req.body.reservetime;
    var reserver = req.body.reserver;
    var userID = req.body.userID;
    var reservertel = req.body.reservertel;
    var reservermemo = req.body.reservermemo;
        Store.findOne({_id: storeID}, function(err, rawContent){
        if(err) throw err;
        rawContent.reserve.push({reserver: reserver, reservertel: reservertel, reservermemo: reservermemo, reservetime: reservetime });
        rawContent.save(function(err){
            if(err) throw err;
        });
    });
    
        User.findOne({_id: userID}, function(err, rawContent){
        if(err) throw err;
        rawContent.reserve.push({reservestore: reservestore, reservetime: reservetime, reservermemo: reservermemo, storeID: storeID });
        rawContent.save(function(err){
            if(err) throw err;
        });
    });


    res.redirect('/reserve_ok');
});
//예약취소
router.post('/reserve_cancel', function(req, res){
    var storeID = req.body.storeID;
    var reserveinfo = req.body.reserveinfo;
    
        Store.findOne({_id: storeID}, function(err, rawContent){
        if(err) throw err;
        rawContent.reserve.push({reserver: reserver, reservertel: reservertel, reservermemo: reservermemo, reservetime: reservetime });
        rawContent.save(function(err){
            if(err) throw err;
        });
    });
    
        User.findOne({_id: userID}, function(err, rawContent){
        if(err) throw err;
        rawContent.reserve.push({reservestore: reservestore, reservetime: reservetime, reservermemo: reservermemo, storeID: storeID });
        rawContent.save(function(err){
            if(err) throw err;
        });
    });


    res.redirect('/reserve_ok');
});

router.get('/mark_menu_detail/reply', function(req, res) {
    // 댓글 ajax로 페이징 하는 부분
    var id = req.param('id');
    var page = req.param('page');
    var max = req.param('max'); // 댓글 총 갯수 확인
    var skipSize = (page-1)*5; 
    var limitSize = skipSize + 5;
    if(max < skipSize+5) {limitSize = max*1;} // 댓글 갯수 보다 넘어가는 경우는 댓글 수로 맞춰줌 (몽고디비 쿼리에서 limit은 양의 정수여야함)
    Store.findOne({_id: id}, {comments: {$slice: [skipSize, limitSize]}} , function(err, pageReply){
        if(err) throw err;
        res.send(pageReply.comments);
    });
});


router.post('/login_app', passport.authenticate('login', {
    successRedirect : '/login_app_ok', 
    failureRedirect : '/login_app_fail', //로그인 실패시 redirect할 url주소
    failureFlash : true 
}));
router.get('/login_app_ok', function(req, res,next){
        res.send("Succes");
});  
router.get('/login_app_fail', function(req, res,next){
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
});   


module.exports = router;
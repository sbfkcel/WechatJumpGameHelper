class TiaoYiTiao {
    constructor(){
        const _ts = this,
            {execFile} = require('child_process');

        _ts.m = {
            path:require('path'),
            fs:require('fs'),
            os:require('os'),
            fastify:require('fastify'),
            fastifyStatic:require('fastify-static'),
            io:require('socket.io'),
            execFile:execFile
        };

        _ts.config = {};
        _ts.config.os = (()=>{
            let osName = _ts.m.os.type();
            return osName === 'Darwin' ? 'mac' : osName === 'Linux' ? 'linux' : 'win';
        })();

        // _ts.adb('shell input swipe 100 100 100 800 2000').then(v => {
        //     console.log('执行完成');
        //     console.log(v);
        // }).catch(e => {
        //     console.log('错误了');
        //     console.log(e);
        // })

        
        _ts.screenSize().then(v => {
            let status = v.status,
                data = v.data || {};

            if(status === 'success'){
                _ts.createServer(data);
            };
        }).catch(e => {
            console.log(e.msg);
            console.log(e.data);
        });
    }

    jump(time){
        const _ts = this;
        return new Promise((resolve,reject)=>{
            _ts.adb('shell input swipe 100 100 100 100 '+time).then(v => {
                console.log('跳完了');
                resolve({
                    status:'success',
                    msg:'跳动指令执行完成',
                    data:v
                });
            }).catch(e => {
                reject({
                    status:'error',
                    msg:'跳动指令执行失败',
                    data:e
                });
            });
        })
    }

    socket(socket,screenSize){
        const _ts = this,
            m = _ts.m,
            config = _ts.config;
        
        //通知前端创建元素
        socket.emit('create',screenSize);

        //提交任务
        socket.on('submit',data => {
            let time = Math.round(data);

            _ts.jump(time).then(v => {
                setTimeout(()=>{
                    _ts.screencap('sc.png').then(v => {
                        //更新图片
                        socket.emit('updateImg',{
                            imgSrc:'./static/screen/sc.png?v='+(+new Date)
                        });
                    }).catch(e => {
                        console.log('更新图片四边')
                    });
                    
                },1000);
                
            }).catch(e => {

            });
        });

        _ts.screencap('sc.png').then(v => {
            //更新图片
            socket.emit('updateImg',{
                imgSrc:'./static/screen/sc.png?v='+(+new Date)
            });
        });

        


        // //前台使用socket.send方法发送的消息
        // socket.on('message',data=>{
        //     console.log(data);
        // });

        // //任何事件
        // socket.on('anything',data => {
        //     console.log('任何事件',data)
        // });
        

        //关闭断开触发
        socket.on('disconnect',data => {
            console.log('断开',data);
        });
    }

    createServer(screenSize){
        const _ts = this,
            m = _ts.m,
            config = _ts.config,
            fastify = m.fastify();
        
        //静态资源处理
        fastify.register(m.fastifyStatic,{
            root:m.path.join(__dirname,'static'),
            prefix:'/static/'
        });

        fastify.get('/',(require,reply)=>{
            reply.sendFile('/html/index.html')
        });

        //socket.io
        let io = m.io(fastify.server);
        
        //连接成功
        io.on('connection',(socket)=>{
            _ts.socket(socket,screenSize);
        });

        fastify.listen(5200,err => {
            if(err){
                throw new Error(err);
            }; 
        });
    }
    

    /**
     * 截取手机屏幕并保存到项目的目录中
     * @param {string} imgName 图片名称
     */
    screencap(imgName){
        const _ts = this;
        return new Promise((resolve,reject)=>{
            _ts.adb(`shell screencap -p /sdcard/${imgName}`).then(v => {
                let savePath = _ts.m.path.join(__dirname,'static','screen',imgName);
                _ts.adb(`pull /sdcard/${imgName} ${savePath}`).then(v => {
                    resolve({
                        status:'success',
                        msg:'截图保存成功',
                        data:v
                    });
                }).catch(e => {
                    resolve({
                        status:'success',
                        msg:'截图保存失败',
                        data:e
                    });
                });
            }).catch(e => {
                reject({
                    status:'error',
                    msg:'截图失败',
                    data:e
                });
            });
        });    
    }

    /**
     * 获取屏幕分辩率
     */
    screenSize(){
        const _ts = this;
        return new Promise((resolve,reject)=>{
            _ts.adb('shell wm size').then(v => {
                if(typeof v === 'object' && typeof v.data === 'object' && typeof v.data.stdout === 'string'){
                    let data = v.data.stdout,
                        val = data.match(/\d{1,9}/ig);
                    resolve({
                        status:'success',
                        msg:'屏幕分辩率获取成功',
                        data:{
                            width:val[0],
                            height:val[1]
                        }
                    })
                }else{
                    reject({
                        status:'error',
                        msg:'屏幕分辩率获取失败',
                        data:{}
                    });
                };
            }).catch(e => {
                reject({
                    status:'error',
                    msg:'屏幕分辩率获取出错',
                    data:e
                });
            });
        });
    }

    /**
     * adb命令
     * @param   {string} command adb命令字符串
     * @returns {object} 返回一个Promise对象
     */
    adb(command){
        const _ts = this,
            m = _ts.m,
            config = _ts.config;

        return new Promise((resolve,reject)=>{
            let adbFile = (()=>{
                let extensionName = config.os === 'win' ? '.exe' : '';
                return m.path.join(__dirname,'tool',config.os,'adb' + extensionName);
            })();
            m.execFile(adbFile,command.split(' '),null,(error,stdout,stderr)=>{
                if(error){
                    reject({
                        status:'error',
                        msg:`<adb ${command}> 执行错误`,
                        data:error
                    });
                }else{
                    resolve({
                        status:'success',
                        msg:`<adb ${command}> 执行成功`,
                        data:{
                            stdout:stdout,
                            stderr:stderr
                        }
                    });
                };
            });
        });
    }
};

new TiaoYiTiao();
class Main{
    constructor(){
        const _ts = this;

        _ts.socket = io('ws://localhost:5200');

        //用于保存元素
        _ts.e = {};

        _ts.e.oWin = _ts.$('.win');
        _ts.e.oSubmit = _ts.$('button');

        _ts.e.oSide__starX = _ts.$('#side__starX');
        _ts.e.oSide__starY = _ts.$('#side__starY');
        _ts.e.oSide__endX = _ts.$('#side__endX');
        _ts.e.oSide__endY = _ts.$('#side__endY');
        _ts.e.oSide__tiemPx = _ts.$('#side__timePx');
        _ts.e.oSide__distance = _ts.$('#side__distance');

        _ts.data = {};
        

        //存储用户修改的Time/px
        if(localStorage['timePx']){
            _ts.e.oSide__tiemPx.value = localStorage['timePx'];
        };
        _ts.data.timePx = _ts.e.oSide__tiemPx.value;
        _ts.e.oSide__tiemPx.oninput = event => {
            localStorage['timePx'] = event.target.value;
            _ts.data.timePx = event.target.value;
        };
    }
    init(){
        const _ts = this,
            e = _ts.e;

        //更新本地数据
        _ts.socket.on('create',data => {
            _ts.createElement(data);
        });

        //更新图片
        _ts.socket.on('updateImg',data => {
            e.oImg.src = data.imgSrc;
            e.oImg.style.display = 'block';
            e.oWin.className = 'win';
            e.oWin.style.display = 'block';
        });
    }

    /**
     * 画线
     */
    drawLine(data,isGauge){
        const _ts = this,
            e = _ts.e,
            ctx = _ts.ctx;
        
        let width = e.oCanvas.width,
            height = e.oCanvas.height;
        
        ctx.clearRect(0,0,width,height);

        //绘制标记线
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        if(isGauge){
            ctx.moveTo(data.startX,data.startY);
            ctx.lineTo(data.endX,data.endY);
            ctx.stroke();
        }else{
            if(data.oldEndX && data.oldEndY){
                ctx.moveTo(data.startX,data.startY);
                ctx.lineTo(data.oldEndX,data.oldEndY);
                ctx.stroke();
            };   
        };
        
        //有焦点时才绘制参考线
        if(_ts.isFocus){
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(74,255,255,0.8)';
            ctx.beginPath();
            ctx.moveTo(data.endX + 0.5,0);
            ctx.lineTo(data.endX + 0.5,height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0,data.endY + 0.5);
            ctx.lineTo(width,data.endY + 0.5);
            ctx.stroke();
        };
    }
    createElement(obj){
        const _ts = this,
            e = _ts.e;
        let width = obj.width,
            height = obj.height;
        
        //绘图板
        e.oCanvas = _ts.ce('<canvas class="win__canvas"></canvas>');
        e.oCanvas.width = obj.width;
        e.oCanvas.height = obj.height;
        _ts.ctx = e.oCanvas.getContext('2d');

        //容器
        e.oWin.style.width = obj.width + 'px';
        e.oWin.style.height = obj.height + 'px';

        //图片
        e.oImg = new Image();
        e.oImg.className = 'win__img';
        e.oImg.style.width = obj.width + 'px';
        e.oImg.style.height = obj.height + 'px';
        e.oImg.style.display = 'none';

        //提示
        e.oTip = _ts.ce('<div class="win__loading"></div>');
        e.oTip.style.width = obj.width + 'px';
        e.oTip.style.height = obj.height + 'px';

        e.oWin.appendChild(e.oTip);
        e.oWin.appendChild(e.oCanvas);
        e.oWin.appendChild(e.oImg);

        //元素添加事件
        _ts.eAddEvent();
        
    }
    eAddEvent(){
        const _ts = this,
            data = _ts.data,
            e = _ts.e;
        e.oCanvas.onmousedown = event => {
            _ts.isMouseDown = true;

            data.startX = event.pageX;
            data.startY = event.pageY;

            e.oSide__starX.value = data.startX;
            e.oSide__starY.value = data.startY;

            _ts.drawLine(data);
        };

        //画面中移动中绘制辅助参考线及标记线
        e.oCanvas.onmousemove = event => {
            data.endX = event.pageX;
            data.endY = event.pageY;

            if(_ts.isMouseDown){
                e.oSide__endX.value = data.endX;
                e.oSide__endY.value = data.endY;
                
                //计算c边长
                data.distance = (()=>{
                    let w = Math.abs(data.startX - data.endX),
                        h = Math.abs(data.startY - data.endY);
                    //console.log(w,h);

                    //根据勾股定理得出边长
                    return Math.sqrt(Math.pow(w,2) + Math.pow(h,2));
                })();

                //前台显示限制3位小数
                e.oSide__distance.value = data.distance.toFixed(3);
                _ts.drawLine(data,true);
            }else{
                _ts.drawLine(data);
            };  
        };

        //弹起时，设置需要绘制的结束点
        e.oCanvas.onmouseup = event => {
            _ts.isMouseDown = false;
            data.oldEndX = data.endX;
            data.oldEndY = data.endY;
        };

        //光标移除画面，不再绘制辅助参考线
        e.oCanvas.onmouseover = event => {
            _ts.isFocus = true;
        };
        e.oCanvas.onmouseout = event => {
            _ts.isFocus = false;
            _ts.drawLine(data);
        };

        e.oSubmit.onclick = event => {
            if(data.distance){
                let time = data.distance * +data.timePx,
                    width = e.oCanvas.width,
                    height = e.oCanvas.height;

                data.oldEndX = undefined;
                data.oldEndY = undefined;

                e.oWin.className = 'win win--jump';
                _ts.ctx.clearRect(0,0,width,height);
                _ts.socket.emit('submit',time);
            }else{
                alert('请在左侧画布中拖选距离');
            };
        };
    }

    //选择元素
    $(string){
        return document.querySelectorAll(string)[0];
    }

    //创建元素
    ce(string){
        let o = document.createElement('div');
            o.innerHTML = string;

        let nodes = o.childNodes;
        return nodes.length === 1 ? nodes[0] : nodes;
    }
};

let a = new Main();
a.init();






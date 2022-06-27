export module es {
    /** 新建一个tween动作 */
    export function tween(target): tween_action {
        let act = new tween_action();
        act['init'](target);
        return act;
    }
    /**
     * 获取未完成的tween动作数量
     * @param target 执行tween的对象
     * @returns
     */
    export function getUndoneActionCount(target): number {
        if (target && target['gk7_tweenCount'])
            return target['gk7_tweenCount'].run();
        return 0;
    }
    /**
     * 清除action
     * @param target 执行tween的对象
     * @param quickComplete 是否立即完成剩余动作,会顺序执行每个阶段最后一次update,包括回调方法
     */
    export function killTween(target, quickComplete = false) {
        getUndoneActionCount(target) > 0 && target['gk7_kill'] && target['gk7_kill'].runWith(quickComplete);
    }
    /** tween工厂 */
    export class tween_core {

        private _actions: tween_action[] = [];

        //大时钟 调度
        private update() {
            const acts = this._actions;
            let act = null;
            let delta = 1 / 60.0;
            for (let i = 0; i < acts.length; i++) {
                act = acts[i];
                if (act.isDone()) {
                    --act._times;
                    if (act._times === 0) {
                        acts.splice(i, 1);
                        --i;
                        continue;
                    }
                    act.resume();
                }
                act.update(delta);
            }
        }

        //@friend tween_action 隐藏 不允许被外部调用 仅供 tween_action 类调度
        private add(act: tween_action) {
            this._actions.push(act);
        }
        //@friend tween_action 隐藏 不允许被外部调用 仅供 tween_action 类调度ß
        private sub(act: tween_action) {
            let index = this._actions.indexOf(act);
            index != -1 && this._actions.splice(index, 1);
        }

        private _timerID = -1;
        /** 停止tween所有tick  PS: 此操作会停下所有的动作 */
        public stop() {
            if (this._timerID == -1)
                return;
            window.clearInterval(this._timerID);
            this._timerID = -1;
        }

        /** 开启/恢复tween所有tick */
        public resume() {
            if (-1 == this._timerID) {
                this._timerID = window.setInterval(this.update.bind(this), 1000 / 60.0);
            }
        }

        private static _inst: tween_core = null;
        public static get inst(): tween_core {
            if (!tween_core._inst) {
                tween_core._inst = new tween_core();
                tween_core._inst.resume();
            }
            return tween_core._inst;
        }
        private constructor() { }
    }
    /** 维护tween链 */
    export class tween_action {

        protected _target = null;
        protected _index = 0;
        protected _commands: command[] = [];
        protected _times = 1;

        protected init(target) {
            this._target = target;
            this._target['gk7_kill'] = Laya.Handler.create(this,this.clear,null,false);
            this._target['gk7_tweenCount'] = Laya.Handler.create(this,this.getUndoneActionCount,null,false);
        }

        /**
         * 缓动
         * @param dur 持续时间
         * @param props 目标属性
         * @param easeFn ease处理方法 例如: Laya.Ease.backInOut
         */
        to(dur: number, props: any, easeFn = null) {

            let t = new command(this._target);
            t._tm = 0;
            t._dur = dur;
            t._dest = props;
            t._easeHandler = easeFn || Laya.Ease.linearNone;
            let b = this._commands.length > 0 ? this._commands[this._commands.length - 1]._dest : this._target;
            for (let k in props) {
                t._src[k] = k in b ? b[k] : this._target[k];
            }
            this._commands.push(t);
            return this;
        }
        /**
         * 贝塞尔运动
         * es.tween(this.sprite).bezier(1.0,new Laya.Point(0,0), 
         *      new Laya.Point(100,100), 
         *      new Laya.Point(300,0)).call( this.callbackFunction ).start();
         * 
         */
        bezier(dur: number, startPoint: Laya.Point, peakPoint: Laya.Point, endPoint: Laya.Point) {
            let t = new bezierCommand(this._target, dur, startPoint, peakPoint, endPoint);
            this.fullPreStateDest(t);
            this._commands.push(t);
            return this;
        }
        /**
         * 加入一个回调
         * @param fn 回调
         */
        call(fn: Function) {
            let t = new callbackCommand(fn);
            this.fullPreStateDest(t);
            this._commands.push(t);
            return this;
        }

        /**
         * 在动作间添加一个间隔
         * @param time 间隔秒
         */
        delay(time: number) {
            let t = new delayCommand(this._target);
            this.fullPreStateDest(t);
            t._tm = 0;
            t._dur = time;
            this._commands.push(t);
            return this;
        }

        /**
         * 循环 当 times < 0 无限循环  为0时 不执行动作  为1时执行一次
         * @param times 次数 默认1
         */
        loop(times: number = 1) {
            this._times = times;
            return this;
        }

        /**
         * 开启缓动
         */
        start() {
            tween_core.inst['add'](this);
        }


        /** 清除动作 是否立即完成所有动作 */
        clear(immediately) {
            this._target['gk7_kill'] = null;
            this._target['gk7_tweenCount'] = null;
            //从更新池中移除
            tween_core.inst['sub'](this);
            //如果选择了立即完成
            if (immediately) {
                for (let command of this._commands) {
                    command.immediatelyComplete();
                }
            }
            this._commands = [];
        }

        /** 获取未完成的动作数量 */
        getUndoneActionCount() {
            return this._commands.length - this._index;
        }

        //将最后一个动作的结束值作为当前动作的结束状态
        protected fullPreStateDest(curren: command) {
            curren._dest = this._commands.length > 0 ? this._commands[this._commands.length - 1]._dest : this._target;
        }

        // 恢复所有动作
        protected resume() {
            this._index = 0;
            for (let com of this._commands) {
                com._tm = 0;
            }
        }

        // 每帧更新
        protected update(dt) {
            let com = this._commands[this._index];
            if (!com.isDone()) {
                com.update(dt);
            }
            else {
                ++this._index;
            }
        }

        // 完成
        protected isDone() {
            return this._index >= this._commands.length;
        }
    }
    /** 基础command, 主要对属性进行线性插值 */
    export class command {

        _tm = 0;
        _dur = 0;
        _src = {};
        _dest = {};
        _target = null;
        _easeHandler: (t: number, b: number, c: number, d: number) => number = null;
        constructor(target) { this._target = target; }

        isDone() {
            return this._dur === 0 || this._tm / this._dur >= 1.0;
        }
        update(dt) {
            this._tm += dt;
            this._tm = this._tm > this._dur ? this._dur : this._tm;
            let r = this._easeHandler(this._tm, 0, 1, this._dur);
            for (let k in this._dest) {
                this._target[k] = this._src[k] + (this._dest[k] - this._src[k]) * r;
            }
        }
        /** 立即完成当前命令 */
        immediatelyComplete() {
            if (this.isDone()) return;
            this._tm = this._dur;
            this.update(1 / 60);
        }
    }
    /** 延时 */
    class delayCommand extends command {
        isDone() {
            return this._dur === 0 || this._tm / this._dur >= 1.0;
        }
        update(dt) {
            this._tm += dt;
            this._tm = this._tm > this._dur ? this._dur : this._tm;
        }
        immediatelyComplete() {
            this._tm = this._dur;
        }
    }
    /** 回调command */
    class callbackCommand extends command {
        constructor(fn) {
            super(null);
            this._tm = 0;
            this._dur = 1 / 60.0;
            this._fn = fn;
        }

        _fn: Function = null;
        isDone() {
            this._fn && this._fn();
            this._fn = null;//保证只执行一次
            return true;
        }
    }
    /** 贝塞尔command */
    class bezierCommand extends command {

        posArr: Laya.Point[];
        constructor(target: any, dur: number, startPoint: Laya.Point, peakPoint: Laya.Point, endPoint: Laya.Point) {
            super(target);
            this._dur = dur;
            this.posArr = [
                startPoint,
                peakPoint,
                endPoint
            ];
        }

        update(dt) {
            this._tm += dt;
            this._tm = this._tm > this._dur ? this._dur : this._tm;

            const value = this._tm;
            const posArr = this.posArr;
            this._target.x = (1 - value) * (1 - value) * posArr[0].x + 2 * value * (1 - value) * posArr[1].x + value * value * posArr[2].x;
            this._target.y = (1 - value) * (1 - value) * posArr[0].y + 2 * value * (1 - value) * posArr[1].y + value * value * posArr[2].y;
        }

    }
}
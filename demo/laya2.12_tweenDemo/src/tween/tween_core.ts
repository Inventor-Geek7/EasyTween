export module gk7 {

    export function tween(target: Laya.Sprite | Laya.Transform3D) {
        let act = new tween_action();
        act['init'](target);
        return act;
    }

    export class tween_core {


        private _mainTimerID = -1;
        private _actions: tween_action[] = [];

        //大时钟 调度
        private update(delta: number) {

            const acts = this._actions;
            let act = null;
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

        /** 停止 大时钟  PS: 此操作会停下所有的动作 */
        public stop() {
            if (this._mainTimerID != -1) {
                clearInterval(this._mainTimerID);
            }
        }

        /** 开启/恢复 大时钟 */
        public resume() {
            if (this._mainTimerID == -1) {
                let inst = tween_core.inst;
                let now = performance.now();
                let oldtime = now;
                let deltatime = 1 / 60.0;
                inst._mainTimerID = setInterval(
                    () => {
                        now = performance.now();
                        deltatime = (now - oldtime) / 1000.0;
                        oldtime = now;
                        inst.update(deltatime);
                    }, 0
                );
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

    export class tween_action {

        protected _target: Laya.Sprite | Laya.Transform3D = null;
        protected _index = 0;
        protected _commands: command[] = [];
        protected _times = 1;

        protected init(target: Laya.Sprite | Laya.Transform3D) {
            this._target = target;
            this._target['clearActions'] = (immediately) => {
                this.clear(immediately);
            }
            this._target['actionCount'] = () => {
                return this._commands.length - 1 - this._index;
            }
        }

        /**
         * 缓动
         * @param dur 持续时间
         * @param props 目标属性
         * @param opts 第一个参数是 ease处理方法 例如: Laya.Ease.backInOut
         */
        to(dur: number, props: any, ...opts) {

            try {
                let t = new command(this._target);
                t._tm = 0;
                t._dur = dur;
                t._dest = props;
                t._easeHandler = opts.length > 0 ? opts[0] : Laya.Ease.linearNone;
                let b = this._commands.length > 0 ? this._commands[this._commands.length - 1]._dest : this._target;
                for (let k in props) {
                    t._src[k] = k in b ? b[k] : this._target[k];
                }
                this._commands.push(t);
            }
            catch (e) {
                console.error(e);
            }

            return this;
        }

        /**
         * 加入一个回调
         * @param fn 回调
         */
        call(fn: Function) {
            let t = new command_callback(fn);
            this._commands.push(t);
            return this;
        }

        /**
         * 在动作间添加一个间隔
         * @param time 间隔秒
         */
        delay(time: number) {
            let t = new command(this._target);
            t._tm = 0;
            t._dur = time;
            t._easeHandler = Laya.Ease.linearNone;
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
            return tween_core.inst['add'](this);
        }


        /** 清除动作 是否立即完成所有动作 */
        clear(immediately) {
            if (immediately) {
                let command = this._commands[this._commands.length - 1];
                for (let k in command)
                    this._target[k] = command[k];
            }
            tween_core.inst['sub'](this);
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
                this._index++;
            }
        }

        // 完成
        protected isDone() {
            return this._index >= this._commands.length;
        }
    }

    export class command {

        _tm = 0;
        _dur = 0;
        _src = {};
        _dest = {};
        _target: Laya.Sprite | Laya.Transform3D = null;
        _easeHandler: (t: number, b: number, c: number, d: number) => number = null;
        constructor(target: Laya.Sprite | Laya.Transform3D) { this._target = target; }

        isDone() {
            return this._dur === 0 || this._tm / this._dur >= 1.0;
        }
        update(dt) {
            this._tm += dt;
            this._tm = this._tm > this._dur ? this._dur : this._tm;
            let r = this._tm > 0 ? this._easeHandler(this._tm, 0, 1, this._dur) : 0;
            for (let k in this._dest) {
                this._target[k] = this._src[k] + (this._dest[k] - this._src[k]) * r;
            }
        }
    }

    export class command_callback extends command {
        constructor(fn) {
            super(null);
            this._tm = 0;
            this._dur = 1 / 60.0;
            this._fn = fn;
        }

        _fn: Function = null;
        isDone() {
            this._fn && this._fn();
            return true;
        }
    }
}
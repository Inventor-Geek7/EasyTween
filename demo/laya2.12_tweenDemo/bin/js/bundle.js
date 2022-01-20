(function () {
    'use strict';

    var gk7;
    (function (gk7) {
        function tween(target) {
            let act = new tween_action();
            act['init'](target);
            return act;
        }
        gk7.tween = tween;
        class tween_core {
            constructor() {
                this._mainTimerID = -1;
                this._actions = [];
            }
            update(delta) {
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
            add(act) {
                this._actions.push(act);
            }
            sub(act) {
                let index = this._actions.indexOf(act);
                index != -1 && this._actions.splice(index, 1);
            }
            stop() {
                if (this._mainTimerID != -1) {
                    clearInterval(this._mainTimerID);
                }
            }
            resume() {
                if (this._mainTimerID == -1) {
                    let inst = tween_core.inst;
                    let now = performance.now();
                    let oldtime = now;
                    let deltatime = 1 / 60.0;
                    inst._mainTimerID = setInterval(() => {
                        now = performance.now();
                        deltatime = (now - oldtime) / 1000.0;
                        oldtime = now;
                        inst.update(deltatime);
                    }, 0);
                }
            }
            static get inst() {
                if (!tween_core._inst) {
                    tween_core._inst = new tween_core();
                    tween_core._inst.resume();
                }
                return tween_core._inst;
            }
        }
        tween_core._inst = null;
        gk7.tween_core = tween_core;
        class tween_action {
            constructor() {
                this._target = null;
                this._index = 0;
                this._commands = [];
                this._times = 1;
            }
            init(target) {
                this._target = target;
                this._target['clearActions'] = (immediately) => {
                    this.clear(immediately);
                };
                this._target['actionCount'] = () => {
                    return this._commands.length - 1 - this._index;
                };
            }
            to(dur, props, ...opts) {
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
            call(fn) {
                let t = new command_callback(fn);
                this._commands.push(t);
                return this;
            }
            delay(time) {
                let t = new command(this._target);
                t._tm = 0;
                t._dur = time;
                t._easeHandler = Laya.Ease.linearNone;
                this._commands.push(t);
                return this;
            }
            loop(times = 1) {
                this._times = times;
                return this;
            }
            start() {
                return tween_core.inst['add'](this);
            }
            clear(immediately) {
                if (immediately) {
                    let command = this._commands[this._commands.length - 1];
                    for (let k in command)
                        this._target[k] = command[k];
                }
                tween_core.inst['sub'](this);
            }
            resume() {
                this._index = 0;
                for (let com of this._commands) {
                    com._tm = 0;
                }
            }
            update(dt) {
                let com = this._commands[this._index];
                if (!com.isDone()) {
                    com.update(dt);
                }
                else {
                    this._index++;
                }
            }
            isDone() {
                return this._index >= this._commands.length;
            }
        }
        gk7.tween_action = tween_action;
        class command {
            constructor(target) {
                this._tm = 0;
                this._dur = 0;
                this._src = {};
                this._dest = {};
                this._target = null;
                this._easeHandler = null;
                this._target = target;
            }
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
        gk7.command = command;
        class command_callback extends command {
            constructor(fn) {
                super(null);
                this._fn = null;
                this._tm = 0;
                this._dur = 1 / 60.0;
                this._fn = fn;
            }
            isDone() {
                this._fn && this._fn();
                return true;
            }
        }
        gk7.command_callback = command_callback;
    })(gk7 || (gk7 = {}));

    var Scene = Laya.Scene;
    var REG = Laya.ClassUtils.regClass;
    var ui;
    (function (ui) {
        var test;
        (function (test) {
            class TestSceneUI extends Scene {
                constructor() { super(); }
                createChildren() {
                    super.createChildren();
                    this.loadScene("test/TestScene");
                }
            }
            test.TestSceneUI = TestSceneUI;
            REG("ui.test.TestSceneUI", TestSceneUI);
        })(test = ui.test || (ui.test = {}));
    })(ui || (ui = {}));

    class GameUI extends ui.test.TestSceneUI {
        constructor() {
            super();
            var scene = Laya.stage.addChild(new Laya.Scene3D());
            var camera = (scene.addChild(new Laya.Camera(0, 0.1, 100)));
            camera.transform.translate(new Laya.Vector3(0, 3, 3));
            camera.transform.rotate(new Laya.Vector3(-30, 0, 0), true, false);
            var directionLight = scene.addChild(new Laya.DirectionLight());
            directionLight.color = new Laya.Vector3(0.6, 0.6, 0.6);
            directionLight.transform.worldMatrix.setForward(new Laya.Vector3(1, -1, 0));
            var box = scene.addChild(new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(1, 1, 1)));
            box.transform.rotate(new Laya.Vector3(0, 45, 0), false, false);
            var material = new Laya.BlinnPhongMaterial();
            Laya.Texture2D.load("res/layabox.png", Laya.Handler.create(null, function (tex) {
                material.albedoTexture = tex;
            }));
            box.meshRenderer.material = material;
            let box_clone = Laya.MeshSprite3D.instantiate(box, box.parent);
            let pos = new Laya.Vector3();
            Laya.Vector3.add(box_clone.transform.localPosition, new Laya.Vector3(-0.7, 3.0, 0), pos);
            box_clone.transform.localScale = new Laya.Vector3(0.3, 0.3, 0.3);
            box_clone.transform.localPosition = pos;
            box.transform.localScaleX;
            gk7.tween(box.transform).to(1.0, {
                localScaleX: 1.4,
                localScaleY: 1.4,
                localScaleZ: 1.4
            }).to(1.0, {
                localScaleX: 1.0,
                localScaleY: 1.0,
                localScaleZ: 1.0
            }).delay(1.0).to(1.0, {
                localRotationEulerY: box.transform.localRotationEulerY + 90
            }).loop(-1).start();
            gk7.tween(this.btn_test).to(1.0, {
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0
            }).to(1.2, {
                scaleX: 1.0,
                scaleY: 1.0,
                alpha: 1.0
            }).loop(-1).start();
            let src = box_clone.transform.localPosition.clone();
            gk7.tween(box_clone.transform).to(1.0, {
                localPositionY: 1.0
            }, Laya.Ease.bounceOut).delay(1.0).call(() => {
                box_clone.transform.localPosition = src.clone();
            }).loop(-1).start();
        }
    }

    class GameConfig {
        constructor() { }
        static init() {
            var reg = Laya.ClassUtils.regClass;
            reg("script/GameUI.ts", GameUI);
        }
    }
    GameConfig.width = 1920;
    GameConfig.height = 1080;
    GameConfig.scaleMode = "fixedauto";
    GameConfig.screenMode = "horizontal";
    GameConfig.alignV = "middle";
    GameConfig.alignH = "center";
    GameConfig.startScene = "test/TestScene.scene";
    GameConfig.sceneRoot = "";
    GameConfig.debug = false;
    GameConfig.stat = true;
    GameConfig.physicsDebug = false;
    GameConfig.exportSceneToJson = true;
    GameConfig.init();

    class Main {
        constructor() {
            if (window["Laya3D"])
                Laya3D.init(GameConfig.width, GameConfig.height);
            else
                Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
            Laya["Physics"] && Laya["Physics"].enable();
            Laya["DebugPanel"] && Laya["DebugPanel"].enable();
            Laya.stage.scaleMode = GameConfig.scaleMode;
            Laya.stage.screenMode = GameConfig.screenMode;
            Laya.stage.alignV = GameConfig.alignV;
            Laya.stage.alignH = GameConfig.alignH;
            Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;
            if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true")
                Laya.enableDebugPanel();
            if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"])
                Laya["PhysicsDebugDraw"].enable();
            if (GameConfig.stat)
                Laya.Stat.show();
            Laya.alertGlobalError(true);
            Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
        }
        onVersionLoaded() {
            Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
        }
        onConfigLoaded() {
            GameConfig.startScene && Laya.Scene.open(GameConfig.startScene);
        }
    }
    new Main();

}());

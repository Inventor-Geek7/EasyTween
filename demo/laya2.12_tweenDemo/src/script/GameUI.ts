import { b2Fixture } from "../../libs/box2d";
import { es } from "../tween/tween_core";

import { ui } from "./../ui/layaMaxUI";
/**
 * 本示例采用非脚本的方式实现，而使用继承页面基类，实现页面逻辑。在IDE里面设置场景的Runtime属性即可和场景进行关联
 * 相比脚本方式，继承式页面类，可以直接使用页面定义的属性（通过IDE内var属性定义），比如this.tipLbll，this.scoreLbl，具有代码提示效果
 * 建议：如果是页面级的逻辑，需要频繁访问页面内多个元素，使用继承式写法，如果是独立小模块，功能单一，建议用脚本方式实现，比如子弹脚本。
 */
export default class GameUI extends ui.test.TestSceneUI {
    
    public btn_test:Laya.Button;
    
    constructor() {
        super();
        //添加3D场景
        var scene: Laya.Scene3D = Laya.stage.addChild(new Laya.Scene3D()) as Laya.Scene3D;

        //添加照相机
        var camera: Laya.Camera = (scene.addChild(new Laya.Camera(0, 0.1, 100))) as Laya.Camera;
        camera.transform.translate(new Laya.Vector3(0, 3, 3));
        camera.transform.rotate(new Laya.Vector3(-30, 0, 0), true, false);

        //添加方向光
        var directionLight: Laya.DirectionLight = scene.addChild(new Laya.DirectionLight()) as Laya.DirectionLight;
        directionLight.color = new Laya.Vector3(0.6, 0.6, 0.6);
        directionLight.transform.worldMatrix.setForward(new Laya.Vector3(1, -1, 0));

        //添加自定义模型
        var box: Laya.MeshSprite3D = scene.addChild(new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(1, 1, 1))) as Laya.MeshSprite3D;
        box.transform.rotate(new Laya.Vector3(0, 45, 0), false, false);
        var material: Laya.BlinnPhongMaterial = new Laya.BlinnPhongMaterial();
        Laya.Texture2D.load("res/layabox.png", Laya.Handler.create(null, function (tex: Laya.Texture2D) {
            material.albedoTexture = tex;
        }));
        box.meshRenderer.material = material;

        //克隆
        let box_clone = Laya.MeshSprite3D.instantiate(box,box.parent);
        let pos = new Laya.Vector3();
        Laya.Vector3.add(box_clone.transform.localPosition,new Laya.Vector3(-0.7,3.0,0),pos);
        box_clone.transform.localScale = new Laya.Vector3(0.3,0.3,0.3);
        box_clone.transform.localPosition = pos;
                

        //3D缓动
        box.transform.localScaleX
        es.tween(box.transform).to(1.0, {
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

        //2D缓动
        es.tween(this.btn_test).to(1.0,{
            scaleX:1.2,
            scaleY:1.2,
            alpha:0
        }).to(1.2,{
            scaleX:1.0,
            scaleY:1.0,
            alpha:1.0
        }).loop(-1).start();

        
        //ease缓动
        let src = box_clone.transform.localPosition.clone();
        es.tween(box_clone.transform).to(1.0,{
            localPositionY:1.0
        },Laya.Ease.bounceOut).delay(1.0).call(()=>{
            //等待一秒后 回调设置位置到起始位置
            box_clone.transform.localPosition = src.clone();
        }).loop(-1).start();
    }
}
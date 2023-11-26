import * as util from "./util.js"
import { abort } from 'process'
import { readFileSync,readdirSync } from 'fs'
export function handler(token, ctx, context) {
    var handlers = {
        data: {},
        "&&": "and",
        "||": "or",
        "!!": "not(",
        ";": ":",
        "===": "=",
        "==": "=",
        "true": "1",
        "false": "0",
        "::": ":",
        "const": (ctx, children, context) => {
            var headers=context.headers=context.headers||{}
            if(headers=={}){
            readdirSync('./src/headers/').forEach((file)=>{
                headers=Object.assign(headers, JSON.parse(fs.readFileSync('./src/headers/'+file)));
            })
            }
            context.data = context.data || {}
            context.data.var = context.data.var || {}
            context.data.functions = context.data.functions || headers
            context.data.functionCall = context.data.functionCall || {}
            context.data.types=context.data.types||['number','string','list','boolexpr','methodCall','value']
            context.data.var.strLists = context.data.var.strLists || ["Str0", "Str1", "Str2", "Str3", "Str4", "Str5", "Str6", "Str7", "Str8", "Str9"]
            context.data.currentScope = context.data.currentScope || "global"
        },
        "var": function (ctx, children, context, scope) {
            //util.log(context)
            scope = scope || context.data.currentScope || "global"
            var children = []
            var val = ctx.expression()
            /*if ((val.getText()[0] == '"') || (
                !isNaN(val.getText()))) {
                //String or Number
                var type = "int";
                if (!(ctx.type == null) && !(ctx.type() == null) && (ctx.type().hasOwnProperty('getText'))) {
                    //util.log(ctx.type())
                    type = ctx.type().getText()
                }
                //Object.values(context.data.var.num).forEach((elm, i) => { if (((elm == "") && (index == 0)) || (elm == ctx.identifier().getText())) { index = i } })
                if (val.getText()[0] == '"') {
                    type = "string"
                }
                if (val.getText().split('.').length > 1) {
                    type = "float"
                }
                children.push({ type, value: val.getText() })
            } else if ((val.getText()[0] == '[') && (!(val.getText()[1] == '['))) {
                //Arrays
                //context.data.var.list.forEach((elm, i) => { if (((elm == "") && (strIndex == 0) && (i > 26)) || (elm == ctx.identifier().getText())) { strIndex = i } })
                var list = val.getText().replace('[', '').slice(list.length - 1, 1)
                list = util.split(list, ',', util.genStrMap(list))
                var type = "array"
                if (!(ctx.type == null) && !(ctx.type() == null) && (ctx.type().hasOwnProperty('getText'))) {
                    type = ctx.type().getText()
                }
                children.push({ type, value: list })
            } else if (val.getText().includes('(') && val.getText().includes(')')) {
                //assume function call
                children.push(context.visit(val))
                var type = children[0].retType
                //antlr madness
                if (!(ctx.type == null) && !(ctx.type() == null) && (ctx.type().hasOwnProperty('getText'))) {
                    type = ctx.type().getText()
                }
            } else if (ctx.hasOwnProperty('boolexpr')) {
                children.push({ type: "bool", value: context.visit(ctx.boolexpr()) })
            } else {

                var type = ctx.type().getText() || "unknown"
                children.push({ type, value: context.visit(ctx.expression()) })
            }*/
            var varType ="undef"
            context.data.types.forEach((type)=>{
                if(ctx.hasOwnProperty(type)&&(typeof ctx[type]=="function")&&(!(ctx[type]()==null))){
                    if(['value','boolexpr','methodCall'].includes(type)){
                        if(type=='value'){
                            varType=context.data.var[ctx.identifier()[1].getText()].varType
                        }else if(type=='methodCall'){
                            varType=context.visit(val).retType
                        }else if(type=='boolexpr'){
                            varType='bool'
                        }

                    }else{
                        varType=type
                    }
                    return
                }
            })
            if(ctx.hasOwnProperty('type')&&(typeof ctx.type=="function")&&(!(ctx.type()==null)))varType=ctx.type().getText()
            context.data.var[ctx.identifier().getText()[1]]={varType}
            return { name: ctx.identifier().getText(), varType, children:[context.visit(ctx.expression())], type: "varDec" }
        },
        "while": function (ctx, children, context) {
            var body = context.visit(ctx.statement())
            return { type: "while", condition: context.visit(ctx.boolexpr()), children: body }
        },
        "if": (ctx, children, context) => {
            var body = context.visit(ctx.statement())
            return { type: "if", condition: context.visit(ctx.boolexpr()), children: body }
            //return `If ${ctx.boolexpr().getText()}:${body.substring(1, body.length - 1)}:End:`
        },
        "ifElse": (ctx, children, context) => {
            var ifBody = context.visit(ctx.statement()[0])
            var elseBody = context.visit(ctx.statement()[1])
            return { type: "if", condition: context.visit(ctx.boolexpr()), children: [ifBody,elseBody] }
            //return `If ${ctx.boolexpr().getText()}:${ifBody.substring(1, ifBody.length - 1)}:Else:${elseBody.substring(1, elseBody.length - 1)}:End:`
        },
        "asm": (ctx, children, context) => {
            return {}
        },
        "funcParams": (ctx, children, context) => {

            let code = [];

            for (let i = 0; i < ctx.getChildCount(); i++) {

                if (!(context.visit(ctx.getChild(i)) == "")) code.push(context.visit(ctx.getChild(i)));
            }

            return code;
        },
        "function": (ctx, children, context) => {

            //util.log('ctx:', ctx)

            var paramsList = ctx.func_params().getText().split(')')[0].split(',')
            var params = []
            paramsList.forEach((elm) => { params.push({ name: elm.split(':')[0], type: elm.split(':')[1] }) })
            context.data.functions[ctx.identifier().getText()] = { type: "function", name: ctx.identifier().getText(), params, retType: ctx.type().getText(), children: context.visit(ctx.statement()) }
            return context.data.functions[ctx.identifier().getText()]

            //util.log(ctx.number())
            //return `:Label ${context.data.functions[name].label}:${context.visit(ctx.statement())}:______:`
        },
        "varAcess": (ctx, children, context) => {
            if ((typeof ctx.number == "function") && !(ctx.number() == null)) {
                util.log("var:", ctx.getText())
                var type = "number"
                if (ctx.getText().split('.').length > 1) {
                    type = "float"
                }
                return { type, val: ctx.getText() }
            } else {
                try {
                    return { type: "var", children: [], name: ctx.identifier().getText(), type: context.data.var[ctx.identifier().getText()].varType }
                } catch {

                    util.error(`${ctx.identifier().getText()} is undefined`, 'Alloc', ctx)
                }

            }
        },
        "funcCall": (ctx, children, context) => {

            var method = []
            //util.log(ctx.identifier().getText())
            ctx.identifier().getText().split('.').forEach((elm) => {
                method.push(elm)
            })
            var baseClass = []
            if (method.length > 1) {
                baseClass = method.slice(0, -1)
            }
            util.log("method:", ctx.identifier().getText())
            try {
                return { type: "funcCall", children: [], class: baseClass, name: method[method.length - 1], params: context.visit(ctx.methodparams()), retType: context.data.functions[method.join('.')].retType }
            } catch (err) {
                util.termLog(`ERROR: ${err}`, ctx.identifier().getText(), JSON.stringify(method), JSON.stringify(context.visit(ctx.methodparams())))
                //abort()
            }
        },
        'list':(ctx,children,context)=>{
                var list = ctx.getText().replace('[', '')
                list = util.split(list.slice(list.length - 1, 1), ',', util.genStrMap(list.slice(list.length - 1, 1)))
                return { type:"array", value: list, children:context.visitChildren()}
        },
        'string':(ctx)=>{
            return {type:"string",value:ctx.getText(),children:[]}
        },
        'number':(ctx)=>{
            return {type:"number",value:ctx.getText(),children:[]}
        }
    }
    //util.log(context)
    if (!token) {
        return handlers
    }
    var children = context.visitChildren(ctx)


    if (handlers.hasOwnProperty(token)) {

        if (typeof handlers[token] == "function") {
            //util.log(Object.keys(ctx),":ctx")
            handlers.const(ctx, children, context)
            util.log(true, token + ':', ctx.getText(), handlers[token](ctx, children, context, ...Array.from(arguments).slice(2)))
            return handlers[token](ctx, children, context, ...Array.from(arguments).slice(2))
        } else {
            return handlers[token]
        }
    }
    return {}
}
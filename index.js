(function(window){
    const MARKDOWN_TAG = "tisql";
    var tidbLoaded = false;
    var idx = 1;
    function loadTiDB(tidbUrl) {
        function unimplemented(callback) {
            const err = new Error("not implemented");
            err.code = "ENOSYS";
            callback(err);
        }
        function unimplemented1(_1, callback) { unimplemented(callback); }
        function unimplemented2(_1, _2, callback) { unimplemented(callback); }
        const go = new Go();
        return fetch(tidbUrl)
            .then(r => r.arrayBuffer())
            .then(buffer => WebAssembly.instantiate(buffer, go.importObject))
            .then(result => {
                fs.stat = unimplemented1;
                fs.lstat = unimplemented1;
                fs.unlink = unimplemented1;
                fs.rmdir = unimplemented1;
                fs.mkdir = unimplemented2;
                go.run(result.instance);
                tidbLoaded = true;
                render_tisql()
            });
    }

    function installMarkdownPlugin(md) {
        var style = '<style>.tisql-container .hidden {min-height:60px;}' +
            '.tisql-loading {font-size:24px;line-height:60px;text-align: center;background: #333;color:#FEFEFE}' +
            '</style>';
        return new markdownitContainer(md,MARKDOWN_TAG,{
            validate: function(params) {
                return params.trim().match(/^tisql\s+(.*)$/);
            },
            render: function (tokens, idx) {
                var m = tokens[idx].info.trim().match(/^tisql\s+(.*)$/);
                if (tokens[idx].nesting === 1) {
                    var a = $("<div></div>")
                    var c = $('<div class="tisql-container"></div>');
                    c.append('<div class="tisql-raw-sql" style="display: none">'+(m[1])+'</div>');
                    c.append('<div class="tisql-loading" style="height:60px;line-height: 60px;text-align: center;background: #333;color: #fff;font-size:24px;">Loading TiDB...</div>');
                    a.append(c);
                    return a.html();
                } else {
                    // closing tag
                    return '';
                }
            }
        });
    }

    function render(container,md,text) {
        installMarkdownPlugin(md);
       var result = md.render(text);
       $(container).empty().append(result);
       if(tidbLoaded) {
           render_tisql();
       }
    }

    function render_tisql() {
        $('.tisql-container').each(function(idx,obj){
            if($(obj).attr("renderer")) {
                return ;
            }
            var text = $(obj).find(".tisql-raw-sql").text();
            $(obj).find(".tisql-loading").remove();
            $(obj).attr("renderer",1);
            $(obj).empty();
            $(obj).removeClass("hidden-sql");
            addTerm($(obj),text);

        });
    }

    function handler (shell,con,line, report) {
        if (line.trim().endsWith(';')) {
            shell.continuedPrompt = false;
            executeSQL(line, function(msg) {
                report([{
                    msg,
                    className: "jquery-console-message-success"
                }])
            })
        } else {
            shell.continuedPrompt = true;
        }

    }

    function addTerm(con,sql) {
        var id = 'term-' + idx;
        idx++;
        var term = $('<div class="term" id="'+(id)+'">');
        con.append(term);
        var shell = term.console({
            promptLabel: 'TiDB> ',
            continuedPromptLabel: ' -> ',
            promptHistory: false,
            commandHandle: function(line, report) {
                handler(shell,con,line,report);
            }
        });
        shell.promptText(sql);
        handler(shell,con,sql,shell.report);
    }

    if(typeof module != 'undefined') {
        module.exports = {
            loadTiDB : loadTiDB,
            render: render,
        }
    }else{
        window.TiDBWasmMarkdown = {
            loadTiDB : loadTiDB,
            render: render,
        };
    }
})(window);



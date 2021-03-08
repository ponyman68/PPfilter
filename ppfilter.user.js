// ==UserScript==
// @name         PPfilter
// @namespace    http://tampermonkey.net/
// @updateURL    
// @downloadURL      
// @version      0.1
// @description  Filters images on 4chan by their data-md5 tag
// @author       (You)
// @match        *://boards.4channel.org/mlp*
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==
/* globals $ */

var $ = window.jQuery;

window.PPfilter = {};
window.PPfilter.constant = {};
window.PPfilter.constant.DB_NAME = "filterDb";
window.PPfilter.constant.DB_VERSION = 69;
window.PPfilter.constant.DB_STORE_NAME = "evilMd5s";
window.PPfilter.dbOpenConnection = (async function(){
    function openDb() {
        return new Promise( function(resolve,reject) {
            var req = indexedDB.open(window.PPfilter.constant.DB_NAME, window.PPfilter.constant.DB_VERSION);
            req.onsuccess = function (evt) {
                resolve(req.result);
            };
            req.onerror = function (evt) {
                reject(Error("[FILTERDB] OPEN ERROR: "+evt.target.errorCode));
            };
            req.onupgradeneeded = function (evt) {
                console.log("[FILTERDB] OPEN - UPGRADE NEEDED");
                var store = evt.currentTarget.result.createObjectStore(
                    window.PPfilter.constant.DB_STORE_NAME, { keyPath: 'md5' });

                store.createIndex('md5', 'md5', { unique: true });
                resolve(openDb());
            };
            }
        )
    };
    return await openDb();
});

window.PPfilter.dbCreateUtils = (function(dbConnection) {
    function getObjectStore(store_name, mode) {
        var tx = dbConnection.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }

    function getAll() {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return store.getAll();
    }

    function count() {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return new Promise( function(resolve,reject) {
            var req = store.count();
            req.onsuccess = function (evt) {
              resolve(req.result);
            };
            req.onerror = function (evt) {
              reject(Error("[FILTERDB] COUNT ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    function get(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return new Promise( function(resolve,reject) {
            var req = store.get(md5);
            req.onsuccess = function (evt) {
              resolve(req.result);
            };
            req.onerror = function (evt) {
              reject(Error("[FILTERDB] GET ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    function set(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readwrite");
        return new Promise( function(resolve,reject) {
            var req = store.add({md5:md5});
            req.onsuccess = function (evt) {
              //console.log("[FILTERDB] add key "+md5);
              resolve(1);
            };
            req.onerror = function (evt) {
              // report key already exists
              // todo dont eat other errors here..
              resolve(0);
            };
            }
        );
    }

    function unset(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readwrite");
        return new Promise( function(resolve,reject) {
            var req = store.delete(md5);
            req.onsuccess = function (evt) {
                //console.log("[FILTERDB] delete key "+md5);
                resolve();
            };
            req.onerror = function (evt) {
                reject(Error("[FILTERDB] DELETE ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    return {
        count:count,
        getAllEvilMd5s:getAll,
        getEvilMd5:get,
        setEvilMd5:set,
        clearEvilMd5:unset
    };
});

window.PPfilter.setEvilMd5inPersistence = async function(dbUtilsProm,md5) {
    await dbUtilsProm.then(function(utils) {utils.setEvilMd5(md5);});
}

window.PPfilter.setMany = async function(dbUtilsProm,arr,progress) {
    var utils = await dbUtilsProm;
    var ct = 0;
    var i = 0;
    for (const md5 of arr) {
        progress(i);
        ct = ct + await utils.setEvilMd5(md5);
        i = i+1;
    }
    progress(arr.length);
    return ct;
}

window.PPfilter.removeEvilMd5fromPersistence = async function(dbUtilsProm,md5) {
    var utils = await dbUtilsProm;
    await utils.clearEvilMd5(md5);
}

window.PPfilter.countDbEntries = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return await utils.count();
}

window.PPfilter.getEvilMd5sfromPersistence = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return new Promise( function(resolve,reject) {
        var req = utils.getAllEvilMd5s();
        req.onsuccess = function(e) {
            var arr = e.target.result.map(o => o.md5);
            resolve(arr);
        }
        req.onerror = function (evt) {
            console.error("[FILTERDB] GETALL: ", evt.target.errorCode);
            reject(Error("[FILTERDB] GETALL: "+evt.target.errorCode) );
        };
        }
    )
}

window.PPfilter.evilMd5ExistsInPersistence = async function(dbUtilsProm,md5) {
    var utils = await dbUtilsProm;
    var got = await utils.getEvilMd5(md5);
    if(got) return 1;
    return 0;
}

// only show the image if it isn't evil
// insert hide/unhide buttons
function handleImageDomNode(dbUtilsProm,n) {
    if(!n.getAttribute("checkedByFilter")) { // guard multiple calls since this code doesnt give a shit
        let md5 = n.getAttribute("data-md5");
        if(md5) {
            n.setAttribute("checkedByFilter","yes");
            var succ = n.nextSibling;
            var parent = n.parentNode;
            var empty = document.createTextNode("🐴");
            parent.replaceChild(empty,n);
            var clearEvilMd5 = function(e) {
                window.PPfilter.removeEvilMd5fromPersistence(dbUtilsProm,md5);
                e.preventDefault();
                e.stopPropagation();
            }
            var addEvilMd5 = function(e) {
                window.PPfilter.setEvilMd5inPersistence(dbUtilsProm,md5);
                e.preventDefault();
                e.stopPropagation();
            }
            var keepImgHiddenAndAddUnhideButton = function() {
                var b = document.createElement("BUTTON");
                b.innerHTML = "clear";
                b.onclick = clearEvilMd5;
                parent.insertBefore(b, succ);
            }
            var showImgAndAddHideButton = function() {
                parent.replaceChild(n,empty);
                var b = document.createElement("BUTTON");
                b.innerHTML = "HIDE";
                b.onclick = function(e) {
                    addEvilMd5(e);
                    parent.replaceChild(empty,n);
                    var b2 = document.createElement("BUTTON");
                    b2.innerHTML = "clear";
                    b2.onclick = clearEvilMd5;
                    parent.insertBefore(b2, succ);
                    b.remove();
                }
                parent.insertBefore(b, succ);
            }
            window.PPfilter.evilMd5ExistsInPersistence(dbUtilsProm,md5).then(function(exists) {
                if(exists){
                    //console.warn("evil found: "+md5);
                    keepImgHiddenAndAddUnhideButton();
                } else {
                    showImgAndAddHideButton();
                }
            });
        }
    }
}

// whenever a div is inserted, check if it contains any img anywhere in the subtree.
// 4chan native extension likes to add raw innerHTML strings into elements directly before adding them to the DOM, this is my last resort
function installStupidMutationObserver(dbUtilsProm,root) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n){if(n.tagName == "DIV") {
                    //jquery just for this ..
                    $(n).find("img").each(function(idx,node) {handleImageDomNode(dbUtilsProm,node);});
                }
            });
        });
    });
    observer.observe(root, {childList: true, subtree: true});
}

// initial DOM parser (on document) and direct DOM modifications (on fragment or document)
function installSubtreeMutationObserver(dbUtilsProm,root,options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n){
                if(n.tagName == "IMG") {
                    handleImageDomNode(dbUtilsProm,n);
                }
            });
        });
    });
    observer.observe(root, options);
}

// every kind of programmatic creation of img nodes and subsequent modification of attributes
// happens in 4chan x a bunch, and possibly other scripts
function installAttributeMutationObserver(dbUtilsProm,root, options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            if(m.target.tagName == "IMG" && m.attributeName == "data-md5") {
                handleImageDomNode(dbUtilsProm,m.target);
            }
        });
    });
    observer.observe(root, options);
}

function installListenForImgsInSubtreeObserver(dbUtilsProm,root) {
    installSubtreeMutationObserver(dbUtilsProm,root, {childList: true, subtree: true});
}
function installListenForAttributeChangesObserver(dbUtilsProm,root) {
    installAttributeMutationObserver(dbUtilsProm,root, {attributes:true});
}

window.document.originalCreateElement = function(e){return {};};
window.document.originalCreateDocumentFragment = function(){return {};};;
function evacuateCreators() {
    window.document.originalCreateElement = document.createElement;
    window.document.originalCreateDocumentFragment = document.createDocumentFragment;
}

function injectedCreateElement(dbUtilsProm,tag) {
    var el = window.document.originalCreateElement(tag);
    if(tag.toLowerCase() == "img") {
        installListenForAttributeChangesObserver(dbUtilsProm,el)
    }
    return el;
}

function injectedCreateDocumentFragment(dbUtilsProm) {
    var frag = window.document.originalCreateDocumentFragment();
    installListenForImgsInSubtreeObserver(dbUtilsProm,frag);
    return frag;
}

// documentFragments and element modifications outside of DOM used by some 4chan native extension and 4chan X functionality
function injectNodeCreationFunctions(dbUtilsProm) {
    evacuateCreators();
    document.createElement = function(tag) { return injectedCreateElement(dbUtilsProm, tag); };
    document.createDocumentFragment = function() { return injectedCreateDocumentFragment(dbUtilsProm); };
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function httpGet(url)
{
    return new Promise(function (resolve,reject) {
        try {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                onload: function(xmlhttp) {
                    if (xmlhttp.readyState==4)
                    {
                        if(xmlhttp.status==200) {
                            resolve({succ:1, value:xmlhttp.responseText});
                        } else {
                            console.error("[PP XMLHTTP] request bad status:");
                            console.error(xmlhttp);
                            resolve({succ:0, value:""});
                        }
                    }
                },
                onerror: function() {
                    console.error("[PP XMLHTTP] request error:");
                    resolve({succ:0, value:""});
                }
            });
        } catch(e) {
            console.error(e);
            resolve({succ:0, value:""});
        }
    });
}

function readSingleFile(e,cb) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    cb(contents);
  };
  reader.readAsText(file);
}

function parseImport(str) {
    var succ = 0;
    var res = undefined;
    var err = {}
    try {
        var arr = JSON.parse(str);
        succ = 1;
        res = arr;
    } catch(e) {
        err.JsonParser = e;
        res = [];
        // todo: isn't there a combinator for this
        for(const m of str.matchAll(/[A-Za-z0-9+/=]{22}==/g)) {res.push(m[0]);}
        if(res.length>0) {
            succ=1;
            err={};
        } else {
            err.RegexParser = "This regex found no matches: /[A-Za-z0-9+/=]{22}==/g";
        }
    }
    return {result:res, success:succ, error:err};
}

var helpstring = `
Import data-md5 entries from a string formatted like this:

* javascript array format i.e.
["0YWEsS/eq8fxPU+TWz6wFw==","0ZA25ixqxea8qxvgejdYGw==","0ZDbpkBbjCuokdL8LflQHw=="]

* or a list of md5s matching the regex /[A-Za-z0-9+/=]{22}==/g i.e.
"0YWEsS/eq8fxPU+TWz6wFw== 0ZA25ixqxea8qxvgejdYGw== 0ZDbpkBbjCuokdL8LflQHw=="
(you can copy the content of the 4chan X settings->filters->Md5 field here directly)
`

function addMenuButton(dbUtilsProm) {
        const style = "top:100px;right:10px;position:absolute;"
        const parent = document.body;

        var open = document.createElement("BUTTON");
        parent.appendChild(open);
        open.setAttribute("style",style);
        open.innerHTML = "open PP options";

        var container = document.createElement("div");
        container.setAttribute("style",style);

        var close = document.createElement("BUTTON");
        close.innerHTML = "close";
        container.appendChild(close);
        var help = document.createElement("SPAN");
        help.innerHTML = "❔";
        help.setAttribute("title",helpstring);
        container.appendChild(help);

        // === entry counter ===
        var counting = document.createElement("P");
        counting.innerHTML = "counting...";
        function updateCounting() {
            window.PPfilter.countDbEntries(dbUtilsProm).then(function(ct) {counting.innerHTML = "PP IndexedDB entries: "+ct;});
        };
        updateCounting();
        container.appendChild(counting);

        // === export button ===
        var exx = document.createElement("BUTTON");
        exx.innerHTML = "wait...";
        function exportTramp() {
            exx.innerHTML="wait...";window.PPfilter.getEvilMd5sfromPersistence(dbUtilsProm).then(function(arr) {exportArr(arr);})
        }
        function exportArr(arr) {
            var json = JSON.stringify(arr);
            download(json, 'PP-indexeddb-'+Date.now()+'.json', 'text/plain');
            exx.innerHTML="export javascript array";
            exx.onclick = exportTramp;
        }
        window.PPfilter.countDbEntries(dbUtilsProm).then(function () {
            exx.innerHTML="export javascript array";
            exx.onclick = exportTramp;
        });
        container.appendChild(exx);

        // === import from textarea button ===
        var p2 = document.createElement("P");
        var input = document.createElement("TEXTAREA");
        var imm = document.createElement("BUTTON");
        imm.innerHTML = "wait...";
        function importArr() {
            if(!input.value) {return;}
            imm.onclick = function() {return;};

            imm.innerHTML = "parsing..."
            var parsed = parseImport(input.value);
            if(parsed.success) {
                var arr = parsed.result;
                function progress(ct) {
                    if(ct%10==0) imm.innerHTML = ct+" of "+arr.length;
                    if(ct == arr.length) {
                        imm.onclick = importArr;
                        updateCounting();
                    }
                }
                window.PPfilter.setMany(dbUtilsProm,arr,progress).then(function(ct) {imm.innerHTML = "imported "+ct+" new! (again?)"});
            } else {
                imm.innerHTML = "broken input. (again?)";
                imm.onclick = importArr;
                console.error("TextArea.value parsing error:");
                console.error(parsed.error);
            }
        }
        window.PPfilter.countDbEntries(dbUtilsProm).then(function () {
            imm.innerHTML="Import from string";
            imm.onclick = importArr;
        });
        p2.appendChild(imm);
        p2.appendChild(document.createElement("BR"));
        p2.appendChild(input);
        container.appendChild(p2);

        // === import from file button ===
        var p4 = document.createElement("P");
        var sp = document.createElement("SPAN");
        sp.innerHTML = "wait...";
        p4.appendChild(sp);
        window.PPfilter.countDbEntries(dbUtilsProm).then(function() {
            sp.innerHTML = "Import from file";
            var fileInput = document.createElement("INPUT");
            fileInput.setAttribute("type","file");
            p4.appendChild(document.createElement("BR"));
            p4.appendChild(fileInput);
            function parseString(str) {
                if(!str) {return;}
                fileInput.setAttribute("disabled","");
                sp.innerHTML = "parsing..."
                var parsed = parseImport(str);
                if(parsed.success) {
                    function progress(ct) {
                        if(ct%10==0) sp.innerHTML = ct+" of "+parsed.result.length;
                        if(ct == parsed.result.length) {
                            fileInput.removeAttribute("disabled");
                            updateCounting();
                        }
                    }
                    window.PPfilter.setMany(dbUtilsProm,parsed.result,progress).then(function(ct) {sp.innerHTML = "imported "+ct+" new! (again?)"});
                } else {
                    fileInput.removeAttribute("disabled");
                    sp.innerHTML = "broken input. see console. (try again)"
                    console.error("File parsing error:");
                    console.error(parsed.error);
                }
            }
            fileInput.addEventListener('change', function(e) {readSingleFile(e,parseString);}, false);
        });
        container.appendChild(p4);

        // === import from URL button ===
        var p5 = document.createElement("P");
        var but = document.createElement("BUTTON");
        var urlInput = document.createElement("INPUT");
        urlInput.setAttribute("type","text");
        but.innerHTML = "wait...";
        window.PPfilter.countDbEntries(dbUtilsProm).then(function() {
            but.innerHTML = "import from URL";
            function fetchAndImport() {
                if(urlInput.value) {
                    but.onclick = function(){return;};
                    but.innerHTML = "fetching...";
                    httpGet(urlInput.value).then(function(res) {
                        if(res.succ) {
                            but.innerHTML = "parsing...";
                            var parsed = parseImport(res.value);
                            if(parsed.success) {
                                function progress(ct) {
                                    if(ct%10==0) but.innerHTML = ct+" of "+parsed.result.length;
                                    if(ct == parsed.result.length) {
                                        updateCounting();
                                    }
                                }
                                window.PPfilter.setMany(dbUtilsProm,parsed.result,progress).then(function(ct) {but.innerHTML = "imported "+ct+" new! (again?)"});
                            } else {
                                but.innerHTML = "Parse error. see console. (again?)";
                                console.error(parsed.error);
                            }
                            but.onclick = fetchAndImport;
                        } else {
                            but.innerHTML = "HTTP error. see console. (again?)";
                            but.onclick = fetchAndImport;
                        }
                    });
                }
            };
            but.onclick = fetchAndImport;
        });
        p5.appendChild(but);
        p5.appendChild(document.createElement("BR"));
        p5.appendChild(urlInput);
        container.appendChild(p5);

        function openFn() {
            parent.replaceChild(container,open);
        }
        function closeFn() {
            parent.replaceChild(open,container);
        }
        open.onclick = openFn;
        close.onclick = closeFn;
}

var installer = function() {
    // todo: open indexeddb connection and never close it ..?
    var dbUtilsProm = window.PPfilter.dbOpenConnection().then(function(conn) { return window.PPfilter.dbCreateUtils(conn); });

    //this is for the DOM parser
    installListenForImgsInSubtreeObserver(dbUtilsProm,document);
    //this is for 4chan x and 4chan native extension (document.createElement and fragments)
    injectNodeCreationFunctions(dbUtilsProm);
    //this is for 4chan native extension thread updater and inline expansion (direct insertion of html text)
    window.setTimeout(function() { installStupidMutationObserver(dbUtilsProm,document); }, 100);

    $(document).ready(function() {addMenuButton(dbUtilsProm)});
};

installer();

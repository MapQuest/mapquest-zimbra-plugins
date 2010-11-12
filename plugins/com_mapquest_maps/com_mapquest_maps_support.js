var com_mapquest_maps_HandlerObject, com_mapquest_maps_jsonp_callbacks;
(function() {
    /** utilities **/
    /** initialize jsonp **/
    com_mapquest_maps_jsonp_callbacks=[];
    
    function makeJsonpProcessor()
    {
        return function(data) {
            var callback=arguments.callee.callback,
                elt=arguments.callee.element,
                index=arguments.callee.index;
            /* delete the callback */
            delete com_mapquest_maps_jsonp_callbacks[index];
            
            /* delete the element */
            setTimeout(function() {
                if (elt&&elt.parentNode) elt.parentNode.removeChild(elt);
            }, 0);
            
            /* invoke the callback */
            if (callback) callback(data);            
        };
    }
    
    function submitJsonp(url, callback)
    {
        var elt=document.createElement('script'),
            processor=makeJsonpProcessor(),
            index=com_mapquest_maps_jsonp_callbacks.length,
            cburl=url + '&callback=com_mapquest_maps_jsonp_callbacks[' + index + ']';
        com_mapquest_maps_jsonp_callbacks[com_mapquest_maps_jsonp_callbacks.length] = processor;
        processor.url=url;
        processor.element=elt;
        processor.callback=callback;
        processor.index=index;
        
        elt.setAttribute('src', cburl);
        document.body.appendChild(elt);
    }
        
    var cachedLinkQuery=null; /* array of [query, response] */
    function executeLinkGenerator(query, options, callback)
    {
        /* see if cached */
        if (cachedLinkQuery && cachedLinkQuery[0]==query) {
            if (callback) callback(cachedLinkQuery[1]);
            return;
        }
        
        var url="http://new.mapquest.com/_svc/linkgenerator?icid=dist_zimbra&withmodel=yes&q=" +
                encodeURIComponent(query);
            
        function handler(data) {
            cachedLinkQuery=[query, data];
            if (callback) callback(data);
        }
        
        submitJsonp(url, handler);
    }
    
    function flipImageVisible()
    {
        this.style.visibility='';
    }
    
    function extractMapTitle(data)
    {
        var i, apps, core, location, address;
        try {
            apps=data.model.applications;
            for (i=0; i<apps.length; i++) {
                if (apps[i].type=='core') {
                    core=apps[i].state;
                    break;
                }
            }
            location=core.locations[0];
            address=location.address;
            
            return (address.street||'') + ' ' + (address.locality||'') +
                ' ' + (address.region||'') + ' ' + (address.country||'');
        } catch (e) {
            return '';
        }
    }
    
    /**
     * Main zimlet handler
     */
    com_mapquest_maps_HandlerObject = function() {
    };
    com_mapquest_maps_HandlerObject.prototype = new ZmZimletBase;
    com_mapquest_maps_HandlerObject.prototype.constructor = com_mapquest_maps_HandlerObject;
    
    com_mapquest_maps_HandlerObject.prototype._createLoadingContent=function() 
    {
        var outerElt, curElt, loaderUrl=this.getResource('ajax_loader.gif');
        
        outerElt=document.createElement('div');
        outerElt.style.position='absolute';
        outerElt.style.left='0px';
        outerElt.style.right='0px';
        outerElt.style.width='100%';
        outerElt.style.height='100%';
        outerElt.style.textAlign='center';
        
        curElt=document.createElement('h3');
        curElt.innerHTML='Loading Map';
        curElt.style.marginTop='25%';
        outerElt.appendChild(curElt);
        
        curElt=document.createElement('img');
        curElt.src=loaderUrl;
        outerElt.appendChild(curElt);

        return outerElt;
    };
    
    var addressSpecs=[
        // detect state abbreviation or zipcode
        {
            /* match city (first word only, consume leading space), state, zip */
            // 
            suffixRegex: /(\x20+[a-zA-Z]+((\x20*\,\x20*)|\x20+))(A[LKSZRAP]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEHINOPST]|N[CDEHJMVY]|O[HKR]|P[ARW]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])(((\x20*\,\x20*)|\x20+)\d{5}(-\d{4})?)?\b/ig,
            maxPrefixLength: 32,
            findMatchStart: function(prefix, suffix) {
                var prefixLen=prefix.length, index, matchLength=0;
                
                /* extract the secondary address line and excess city tokens */
                //alert('searching prefix "' + prefix + '"');
                index=prefix.search(/(((APT|BLDG|DEPT|FL|HNGR|LOT|PIER|RM|S(LIP|PC|T(E|OP))|TRLR|UNIT)\x20*(\#\x20*)?\w{1,5})|(BSMT|FRNT|LBBY|LOWR|OFC|PH|REAR|SIDE|UPPR)\.?)(((\x20*\,\x20*)|\x20+)+[a-zA-Z]+(\x20+[a-zA-Z]+){0,2})?$/ig);
                if (index>=0) {
                    //alert('found sec addr match: ' + prefix + ' (' + index + ')');
                    matchLength+=prefix.length-index;
                    prefix=prefix.substring(0, index);
                }
                
                /* now go after the main address line (+potential extra tokens) */
                /************          (  house number         )( fractional    )(   predirectional                                                                      )((numeric street+suffix         ) (street words)) (postdirectional                                                                       ) (excess city or other tokens)*/
                index=prefix.search(/\b(\d{1,10}([.\-]\d{1,10})?(\x20+1\/[234])?)(\x20+(N[EW]?|S[EW]?|E|W|NORTH|SOUTH|EAST|WEST|NORTHEAST|NORTHWEST|SOUTHEAST|SOUTHWEST))?((\x20+\d{1,5}(TH|ND|ST)(\x20+\w+)(\x20+(N[EW]?|S[EW]?|E|W|NORTH|SOUTH|EAST|WEST|NORTHEAST|NORTHWEST|SOUTHEAST|SOUTHWEST)))|(\x20+\w+){1,5})(((\x20*\,\x20*)|\x20+)+[a-zA-Z]+(\x20+[a-zA-Z]+){0,2})?\x20*$/ig);
                if (index<0) {
                    // No match
                    //alert('no street match on "' + prefix + '"');
                    return -1;
                } else {
                    //alert('street match on "' + prefix.substring(index) + '"');
                    matchLength+=prefix.length-index;
                }
                
                return matchLength;
            }
        }
    ];
    
    /**
     * Custom match function.  Scans for patterns specified in addressSpecs.
     * For each addressSpec, the input is searched for the suffixRegex.  If found,
     * then at most, maxPrefixLength characters are extracted and passed to the findMatchStart
     * function.  If that returns a >=0 length, then it means that the given span
     * matches.
     */
    com_mapquest_maps_HandlerObject.prototype.match=function(content, startIndex)
    {
        var matches, i, matchSpec, regex, prefix, prefixIndex, matchLength, ret;
        
        for (i=0; i<addressSpecs.length; i++) {
            matchSpec=addressSpecs[i];
            regex=matchSpec.suffixRegex;
            regex.lastIndex=startIndex;
            regex.source=content;
            
            match=regex.exec(content);
            regex.lastIndex=0;
            regex.source=null;
            
            if (!match) {
                //alert('no suffix match for ' + content + ' (' + startIndex + ')');
                continue;   // no match
            }
            
            prefixIndex=match.index - matchSpec.maxPrefixLength;
            if (prefixIndex<startIndex) prefixIndex=startIndex;
            prefix=content.substring(prefixIndex, match.index);
            
            //alert('matching prefix ' + prefix + ' suffix ' + match[0]);
            matchLength=matchSpec.findMatchStart(prefix, match[0]);
            if (matchLength<0) {
                //alert('no prefix match for ' + prefix);
                continue; // no match
            }
            
            ret=[];
            ret.index=prefixIndex+prefix.length-matchLength;
            ret.input=content;
            ret[0]=content.substring(ret.index, match.index + match[0].length);
            
            //alert('Matched index=' + ret.index + ', length=' + ret[0].length + ', suffix=' + match[0] + ', full=' + ret[0]);
            
            return ret;
        }
        
        return null;
    };
    
    /**
     * Handle tooltips on content links 
     */
    com_mapquest_maps_HandlerObject.prototype.toolTipPoppedUp = function(
        spanElement, contentObjText, matchContent, canvas)
    {
        /* construct the loading panel */
        var width=300, height=200,
            outerElt, curElt;
        outerElt=document.createElement('div');
        outerElt.style.position='relative';
        outerElt.style.width=width+'px';
        outerElt.style.height=height+'px';
        outerElt.style.textAlign='center';
        outerElt.style.overflow='hidden';
        
        outerElt.appendChild(this._createLoadingContent());
        
        canvas.appendChild(outerElt);
        
        /* generate the link */
        executeLinkGenerator(contentObjText, {}, function(data) {
            var embedUrl=data.links.embed_resolved,
                curElt;
            
            /* add a format=static, width and height to generate an image */
            embedUrl+='&format=static&width=' + width + '&height=' + height;
            
            /* replace the dom */
            curElt=document.createElement('img');
            curElt.style.width=width+'px';
            curElt.style.height=height+'px';
            curElt.style.position='absolute';
            curElt.style.top='0px';
            curElt.style.left='0px';
            curElt.style.visibility='hidden';
            curElt.onload=flipImageVisible;
            curElt.src=embedUrl;
            outerElt.appendChild(curElt);
        });
    };
    
    com_mapquest_maps_HandlerObject.prototype.clicked = function(
        spanElement, contentObjText, matchContent, event)
    {
        this._showMapDialog(contentObjText);
    };
    
    com_mapquest_maps_HandlerObject.prototype._showMapDialog = function(
        mqQuery)
    {
        var width=640, height=480, pview, pdialog, outerElt;
        
        if (width>this.getShell().getW()) width=this.getShell().getW()-100;
        if (height>this.getShell().getH()) height=this.getShell().getH()-100;
        if (width<0) width=300;
        if (height<0) height=300;
        
        pview = new DwtComposite(this.getShell());
        pview.setSize(width, height);
        outerElt=pview.getHtmlElement();
        outerElt.style.overflow='hidden';
        outerElt.style.position='relative';
        outerElt.appendChild(this._createLoadingContent());
        
        pdialog=new ZmDialog({
                title: 'MapQuest Map',
                view: pview,
                parent: this.getShell(),
                standardButtons: [DwtDialog.DISMISS_BUTTON]
        });
        pdialog.setButtonListener(DwtDialog.DISMISS_BUTTON, function() {
                pdialog.popdown()
        });
        
        pdialog.popup();
        
        /* run the query */
        executeLinkGenerator(mqQuery, {}, function(data) {
            var embedUrl=data.links.embed_resolved,
                curElt, mapTitle;
            
            /* replace the dom */
            curElt=document.createElement('iframe');
            curElt.style.width='100%';
            curElt.style.height='100%';
            curElt.style.position='absolute';
            curElt.style.top='0px';
            curElt.style.left='0px';
            //curElt.style.visibility='hidden';
            //curElt.onload=flipImageVisible;
            curElt.setAttribute('frameborder', 'no');
            curElt.setAttribute('scrolling', 'no');
            curElt.src=embedUrl;
            outerElt.appendChild(curElt);
            
            mapTitle=extractMapTitle(data);
            if (mapTitle) {
                pdialog.setTitle('MapQuest Map of ' + mapTitle);
            }
        });

    };
    
})();


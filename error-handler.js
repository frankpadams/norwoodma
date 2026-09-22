window.NORWOOD_ERROR={
  show:function(options){
    options=options||{};
    try{
      var params=new URLSearchParams();
      if(options.title)params.set('title',String(options.title));
      if(options.message)params.set('message',String(options.message));
      if(options.returnTo)params.set('return',String(options.returnTo));
      location.href='error.html'+(params.toString()?'?'+params.toString():'');
    }catch(e){location.href='error.html';}
  }
};
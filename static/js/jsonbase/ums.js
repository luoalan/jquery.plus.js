!function(){
	var last_ms = new Date().valueOf();
	var last_ms_count = 0;

	function uniqueMillisecond(){
		var ms = new Date().valueOf().toString();
		if(ms==last_ms){
			last_ms_count++;
		}else{
			last_ms = ms;
			last_ms_count = 0;
		}
		return combineRes(ms,last_ms_count);

		function combineRes(ms,count){
			return ms+'.'+addZeroPre(count.toString(),10)+Math.round(Math.random()*10000000000);
		}

		function addZeroPre(str,length){
			while(str.length<length) str = '0'+str;
			return str.substr(0,length);
		}
	}

	window.uniqueMillisecond = uniqueMillisecond;
}();

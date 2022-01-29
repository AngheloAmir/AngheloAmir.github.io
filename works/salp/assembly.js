
window.onload = onloadFunction;
var el_progcode = document.getElementsByClassName("area")[0];
var el_activeline = el_progcode.getElementsByTagName("pre")[0];
el_activeline.addEventListener("click", lineclick);
var el_outarea = document.getElementsByClassName("area")[1];
var el_screen1 = document.getElementById("screen1");
var el_screen2 = document.getElementById("screen2");
var el_screen3 = document.getElementById("screen3");
var el_screen4 = document.getElementById("screen4");

//Global variables
var numInputCount = 0;
var lastNumInput = 0;
var MAXMEM = 256;
var RUNSPEED = 0; //1ms delay for each instruction
var FILEEXTENSION = ".salp"; //Simple Assembly Language Programming

//CPU Variables******************************************************************************
var accumulator = 0, memory = [], strLine = [], instruction = "", value = 0, cline = 0;
var result = 0; //0 = equal, 1 = less, 2 = more
var timmer; //hold the timer for executeCommand function, to create a delay
var orderStop = true;
var buffer = []; //Buffer text for the screen;

//Debugger variables*************************************************************************
var lastMemUpdate = 0;
var isdebug = false;

//********************************************************************************************
function onloadFunction() {
	for ( var i = 0; i < MAXMEM; i++)
		memory.push(0);
	for ( var i = 0; i < 4; i++)
		buffer.push("          ");
}

//=======================================================================
function addNewLine(isNewLine, strins) {
	//get the current line number**************************
	var linenum = el_activeline.textContent.substring(0, 3);
	linenum = parseInt(linenum);
	linenum += 1;
	if (linenum >= 256) {
		alert("Max line reach");
		return 0;
	}
	if (linenum < 100 && linenum >= 10)
		linenum = "0" + linenum;
	else if (linenum < 10)
		linenum = "00" + linenum;
	linenum = linenum + " ";

	//create the new line*********************************
	var line = document.createElement("pre");
	var node = document.createTextNode(linenum + strins);
	line.appendChild(node);
	//add the newline************************************
	if (isNewLine) {
		if (el_activeline.nextSibling === null)
			el_progcode.appendChild(line);
		else
			el_progcode.insertBefore(line, el_activeline.nextSibling);
	} else {
		el_progcode.insertBefore(line, el_activeline);
	}
	//add event to the new line element*****************
	line.addEventListener("click", lineclick);
	//change the active line******************************
	el_activeline.className = "";
	line.className = "active";
	el_activeline = line;

	recountLineNumber();
}

//=======================================================================
function lineclick() {
	el_activeline.className = "";
	this.className = "active";
	el_activeline = this;
	numInputCount = 0;
}

//=======================================================================
function setText(str) {
	var linenum = el_activeline.textContent.substring(0, 3);
	linenum = parseInt(linenum);

	if (linenum < 100 && linenum >= 10)
		linenum = "0" + linenum;
	else if (linenum < 10)
		linenum = "00" + linenum;
	linenum = linenum + " ";

	el_activeline.textContent = linenum + str;
	numInputCount = 0;
}

//=======================================================================
function deleteLine() {
	var temp;
	if (el_progcode.childNodes.length <= 3) {
		setText("BRK");
	} else {
		var linenum = el_activeline.textContent.substring(0, 3);
		linenum = parseInt(linenum);
		if (linenum == 0)
			temp = el_activeline.nextSibling;
		else
			temp = el_activeline.previousSibling;
		el_progcode.removeChild(el_activeline);
		el_activeline = temp;
		el_activeline.className = "active";
		recountLineNumber();
	}
}

//=======================================================================
function recountLineNumber() {
	var e = el_progcode.getElementsByTagName("pre");
	for ( var i = 0; i < e.length; i++) {
		var c = e[i];
		var text = c.innerHTML;
		text = text.substring(3, text.length);
		if (i <= 9)
			c.innerHTML = "00" + i + text;
		else if (i <= 99)
			c.innerHTML = "0" + i + text;
		else
			c.innerHTML = "" + i + text;
	}
	numInputCount = 0;
}

//=======================================================================
function inputNumber(n) {
	//Prevents modification for BRK instruction
	if (el_activeline.textContent.lastIndexOf("BRK") >= 0)
		return 0;

	//get the text, exclude number input
	n = parseInt(n);
	var text = el_activeline.textContent;
	text = text.substring(0, text.length - 3);

	//checking if entered num is zero
	if (n == 0 && numInputCount == 0) {
		return 0;
	} else if (numInputCount >= 3) {
		numInputCount = 0;
		lastNumInput = 0;
		el_activeline.textContent = text + "000";
		return 0; //actually it does nothing, just halt the function execution
	} else if (numInputCount == 0) {
		lastNumInput = n;
		el_activeline.textContent = text + "00" + n;
	} else if (numInputCount == 1) {
		lastNumInput = lastNumInput * 10;
		lastNumInput += n;
		el_activeline.textContent = text + "0" + lastNumInput;
	} else {
		lastNumInput = lastNumInput * 10;
		lastNumInput += n;
		if (lastNumInput > 255)
			lastNumInput = 255;
		el_activeline.textContent = text + lastNumInput;
	}
	numInputCount++;
}

//=======================================================================
function moveLine(isForward) {
	if (isForward) {
		if (el_activeline.nextSibling != "[object HTMLPreElement]")
			return 0;
		else {
			el_activeline.className = "";
			el_activeline = el_activeline.nextSibling;
			el_activeline.className = "active";
		}
	} else {
		if (el_activeline.previousSibling != "[object HTMLPreElement]")
			return 0;
		else {
			el_activeline.className = "";
			el_activeline = el_activeline.previousSibling;
			el_activeline.className = "active";
		}
	}
}

//=======================================================================
function runProgram(isDebugging) {
	//clear the variable of the CPU
	accumulator = 0;
	instruction = "";
	value = 0;
	cline = 0;
	result = 0;
	executeCount = 0;
	clearTimeout(timmer);
	orderStop = false;

	//set the value of memory of all memory cell to 0
	for ( var i = 0; i < MAXMEM; i++)
		memory[i] = 0;
	//set the ouput screen to empty
	screenEmpty();

	//first, obtain all text in the el_progcode;
	var pre = el_progcode.getElementsByTagName("pre");
	strLine = [];
	for ( var i = 0; i < pre.length; i++) {
		strLine.push(pre[i].innerHTML);
	}

	//Everything should be initialize, start running the program
	if (!isDebugging)
		timmer = setInterval(executeCommands, RUNSPEED);

}

//=======================================================================
function executeCommands() {
	if (cline >= strLine.length || orderStop) {
		clearTimeout(timmer);
		return 0; //stop execution if exceede
	}
	instruction = getInstruction(strLine[cline]);
	if (instruction == "BRK" || instruction === undefined) {
		clearTimeout(timmer);
		return 0; //stop execution if instruction BRK is reach
	}

	//the get the value of the instruction
	value = getValue(strLine[cline]);

	//Start executing the command
	if (instruction == "LOAD")
		accumulator = value;
	else if (instruction == "LOAD_AT")
		accumulator = memory[value];
	else if (instruction == "STORE") {
		memory[value] = accumulator;
		memChange(value, accumulator);
	} else if (instruction == "STORE_AT") {
		memory[memory[value]] = accumulator;
		memChange(memory[value], accumulator);
	} else if (instruction == "JmpEQual") {
		if (result == 0) {
			cline = value;
			cline--;
		}
	} else if (instruction == "JmpLess") {
		if (result == 1) {
			cline = value;
			cline--;
		}
	} else if (instruction == "JmpMore") {
		if (result == 2) {
			cline = value;
			cline--;
		}
	} else if (instruction == "Jump") {
		cline = value;
		cline--;
	} else if (instruction == "ADD")
		accumulator = domath(true, accumulator, value);
	else if (instruction == "MINus")
		accumulator = domath(false, accumulator, value);
	else if (instruction == "INC_AT") {
		if (++memory[value] >= 256)
			memory[value] = 0;
		memChange(value, memory[value]);
	} else if (instruction == "DEC_AT") {
		if (--memory[value] <= 0)
			memory[value] = 255;
		memChange(value, memory[value]);
	} else if (instruction == "COMPare") {
		if (accumulator == value)
			result = 0;
		else if (accumulator < value)
			result = 1;
		else
			result = 2;
	} else if (instruction == "COMPare_AT") {
		if (accumulator == memory[value])
			result = 0;
		else if (accumulator < memory[value])
			result = 1;
		else
			result = 2;
	}
	//time to read the next line
	cline++;
}

//=======================================================================
function getInstruction(str) {
	var ins = "";
	for ( var i = 4; i < str.length; i++) {
		if (str.charAt(i) == "\t" || str.charAt(i) == " ")
			return ins;
		ins += str[i];
	}
}

//=======================================================================
function getValue(str) {
	var i = str.substring(str.length - 3, str.length);
	return parseInt(i);
}

//=======================================================================
function domath(isAdd, accumulator, value) {
	var temp;
	if (isAdd) {
		temp = accumulator + value;
		if (temp > 255)
			return (temp - 256);
		else
			return temp;
	} else {
		temp = accumulator - value;
		if (temp < 0)
			temp = 256 + temp;
		return temp;
	}
}
//=======================================================================
//check for specific memory changes
function memChange(targetMemory, accumulator) {

	lastMemUpdate = targetMemory;

	//update the screen
	if (targetMemory >= 40 && targetMemory <= 79) {
		var memCel;
		if (targetMemory >= 40 && targetMemory <= 49) {
			memCel = 0;
			targetMemory -= 40;
		} else if (targetMemory >= 50 && targetMemory <= 59) {
			memCel = 1;
			targetMemory -= 50;
		} else if (targetMemory >= 60 && targetMemory <= 69) {
			memCel = 2;
			targetMemory -= 60;
		} else if (targetMemory >= 70 && targetMemory <= 79) {
			memCel = 3;
			targetMemory -= 70;
		}
		//process the change
		var str = buffer[memCel];

		str = str.split('');
		if (accumulator <= 32)
			str[targetMemory] = " ";
		else if (accumulator == 60 || accumulator == 62 || accumulator == 38
				|| accumulator == 160)
			str[targetMemory] = ".";
		else
			str[targetMemory] = String.fromCharCode(accumulator);

		str = str.join('');
		buffer[memCel] = str;
	} else if (targetMemory == 80) {
		el_screen1.innerHTML = buffer[0];
		el_screen2.innerHTML = buffer[1];
		el_screen3.innerHTML = buffer[2];
		el_screen4.innerHTML = buffer[3];
	}
	//create a delay effect for 100MS
	else if (targetMemory == 30 && !isdebug)
		delayCP(50);
	else if (targetMemory == 31 && !isdebug)
		delayCP(100);
	else if (targetMemory == 32 && !isdebug)
		delayCP(200);
	else if (targetMemory == 33 && !isdebug)
		delayCP(accumulator * 10);
	//set thebackgroundcolor
	else if (targetMemory == 35)
		setBackgroundColor(accumulator);

}

//=======================================================================
function screenEmpty() {
	el_screen1.innerHTML = "          ";
	el_screen2.innerHTML = "          ";
	el_screen3.innerHTML = "          ";
	el_screen4.innerHTML = "          ";
	buffer[0] = "          ";
	buffer[1] = "          ";
	buffer[2] = "          ";
	buffer[3] = "          ";
	el_outarea.style.background = "white";
}

//=======================================================================
function delayCP(delayTime) {
	clearTimeout(timmer);
	timer = setTimeout(runningAgain, delayTime);
}

function runningAgain() {
	clearTimeout(timmer);
	timmer = setInterval(executeCommands, RUNSPEED);
	//always get var of setInterval, whatever happens
}

//=======================================================================
function stopProgram(isNoShow) {
	clearTimeout(timmer);
	orderStop = true;
	//stop the program without showing  a  message
	if (isNoShow)
		return 0;

	var ee = document.getElementById("halt");
	ee.style.display = "block";
	/*Fade out effect*/
	var op = 1;
	var timer = setInterval(function() {
		if (op <= 0.1) {
			clearInterval(timer);
			ee.style.display = 'none';
		}
		ee.style.opacity = op;
		ee.style.filter = 'alpha(opacity=' + op * 100 + ")";
		op -= op * 0.2;
	}, 50);
	/*======*/
}

//=======================================================================
function setBackgroundColor(value) {
	switch (value) {
	case 1:
		el_outarea.style.background = "maroon";
		break;
	case 2:
		el_outarea.style.background = "red";
		break;
	case 3:
		el_outarea.style.background = "orange";
		break;
	case 4:
		el_outarea.style.background = "yellow";
		break;
	case 5:
		el_outarea.style.background = "olive";
		break;
	case 6:
		el_outarea.style.background = "green";
		break;
	case 7:
		el_outarea.style.background = "purple";
		break;
	case 8:
		el_outarea.style.background = "fuchsia";
		break;
	case 9:
		el_outarea.style.background = "lime";
		break;
	case 10:
		el_outarea.style.background = "teal";
		break;
	case 11:
		el_outarea.style.background = "aqua";
		break;
	case 12:
		el_outarea.style.background = "blue";
		break;
	case 13:
		el_outarea.style.background = "navy";
		break;
	case 14:
		el_outarea.style.background = "gray";
		break;
	case 15:
		el_outarea.style.background = "silver";
		break;
	default:
		el_outarea.style.background = "white";
	}
}

//=======================================================================
function loadFile() {
	var file = document.querySelector('input[type=file]').files[0];
	var reader = new FileReader();

	//Get the file extension first
	var fileExtension = file.name.substring(file.name.length
			- FILEEXTENSION.length, file.name.length);

	//Check if the file has a valid file extension and then load
	if (fileExtension == FILEEXTENSION) {
		reader.readAsText(file);
		reader.onload = processLoadFile;
	} else
		alert("Not a valid file to be loaded");
}

function processLoadFile(event, estr) {
	//move cursor to the last line then start deleting
	for ( var i = 0; i < 256; i++)
		moveLine(true);
	//delete all line one by one
	//delete 256 times to make sure none will remain
	for ( var i = 0; i < 256; i++)
		deleteLine();

	//process the string load
	var str, instruction, value;

	if (estr === undefined) {
		str = event.target.result;
		str = str.split('\n');
	} else
		str = estr.split('\n');

	for ( var i = 0; i < str.length; i++) {
		//get the value of the instruction
		value = getValue(str[i]);

		if (value < 100 && value >= 10)
			value = "0" + value;
		else if (value < 10)
			value = "00" + value;
		//get the instruction of the code		
		instruction = getInstruction(str[i]);
		if (instruction == "LOAD")
			addNewLine(true, "LOAD	" + value);
		else if (instruction == "LOAD_AT")
			addNewLine(true, "LOAD_AT	" + value);
		else if (instruction == "STORE")
			addNewLine(true, "STORE	" + value);
		else if (instruction == "STORE_AT")
			addNewLine(true, "STORE_AT	" + value);
		else if (instruction == "COMPare")
			addNewLine(true, "COMPare	" + value);
		else if (instruction == "COMPare_AT")
			addNewLine(true, "COMPare_AT	" + value);
		else if (instruction == "JmpEQual")
			addNewLine(true, "JmpEQual	" + value);
		else if (instruction == "JmpLess")
			addNewLine(true, "JmpLess	" + value);
		else if (instruction == "JmpMore")
			addNewLine(true, "JmpMore	" + value);
		else if (instruction == "Jump")
			addNewLine(true, "Jump	" + value);
		else if (instruction == "ADD")
			addNewLine(true, "ADD		" + value);
		else if (instruction == "MINus")
			addNewLine(true, "MINus	" + value);
		else if (instruction == "INC_AT")
			addNewLine(true, "INC_AT	" + value);
		else if (instruction == "DEC_AT")
			addNewLine(true, "DEC_AT	" + value);
		else
			addNewLine(true, "BRK");
	}
	//move the cursor to the top then delete that line
	for ( var i = 0; i < el_progcode.childNodes.length; i++)
		moveLine(false);
	deleteLine();
}

//=======================================================================
function download() {
	//test variables
	var fileData = "";
	var type = "text/plain";

	//Validation
	var fileName = document.getElementById("fileNameField").value;
	if (fileName.length <= 0) {
		alert("File Name cannot be empty");
		return 0;
	}
	fileName += FILEEXTENSION;

	//load all code line into single fileData
	var firstLine = true;
	for ( var i = 1; i < el_progcode.childNodes.length; i++) {
		if (el_progcode.childNodes[i] == "[object HTMLPreElement]") {
			if (firstLine) {
				firstLine = false;
				fileData += el_progcode.childNodes[i].textContent;
			} else
				fileData += "\n" + el_progcode.childNodes[i].textContent;
		}//if el_
	}

	//do the download url
	var a = document.createElement("a");
	var file = new Blob( [ fileData ], {
		type : type
	});
	a.href = URL.createObjectURL(file);
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	setTimeout(function() {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}, 0);
}

//=======================================================================
function loadDemo(n) {
	document.getElementById('demo').style.display = 'none';
	document.getElementById('blackbg').style.display = 'none';
	document.body.style.overflow = 'scroll';
	if (n == 0) {
		processLoadFile(undefined, "000 LOAD	072\n" + "001 STORE	040\n"
				+ "002 LOAD	073\n" + "003 STORE	041\n" + "004 LOAD	033\n"
				+ "005 STORE	042\n" + "006 STORE 080\n" + "007 BRK");
	} else if (n == 1) {
		processLoadFile(undefined, "000 LOAD	072\n" + "001 STORE	040\n"
				+ "002 LOAD	069\n" + "003 STORE	041\n" + "004 LOAD	076\n"
				+ "005 STORE	042\n" + "006 STORE	043\n" + "007 LOAD	079\n"
				+ "008 STORE	044\n" + "009 LOAD	087\n" + "010 STORE	051\n"
				+ "011 LOAD	079\n" + "012 STORE	052\n" + "013 LOAD	082\n"
				+ "014 STORE	053\n" + "015 LOAD	076\n" + "016 STORE	054\n"
				+ "017 LOAD	068\n" + "018 STORE	055\n" + "019 LOAD	033\n"
				+ "020 STORE	056\n" + "021 STORE 080\n" + "022 BRK");
	} else if (n == 2) {
		processLoadFile(undefined, "000 LOAD	032\n" + "001 STORE	040\n"
				+ "002 INC_AT	040\n" + "003 STORE	030\n" + "004 STORE 080\n"
				+ "005 Jump	002\n" + "006 BRK");
	} else if (n == 3) {
		processLoadFile(undefined, "000 LOAD	032\n" + "001 STORE	040\n"
				+ "002 STORE 080\n" + "002 INC_AT	040\n" + "003 STORE	030\n"
				+ "004 LOAD_AT	040\n" + "005 COMPare	127\n"
				+ "006 JmpEQual	000\n" + "007 JmpLess	002\n" + "008 BRK");
	} else if (n == 4) {
		processLoadFile(undefined, "000 LOAD	040\n" + "001 STORE	000\n"
				+ "002 LOAD	065\n" + "003 STORE_AT	000\n" + "004 INC_AT	000\n"
				+ "005 LOAD_AT	000\n" + "006 COMPare	080\n"
				+ "007 JmpLess	002\n" + "008 STORE 080\n" + "009 BRK");
	} else if (n == 5) {
		processLoadFile(undefined, "000 LOAD	033\n" + "003 STORE	040\n"
				+ "004 STORE	080\n" + "000 STORE   030\n" + "005 STORE	041\n"
				+ "006 STORE	050\n" + "007 STORE	080\n" + "000 STORE  030\n"
				+ "008 STORE	042\n" + "009 STORE	051\n" + "010 STORE	060\n"
				+ "011 STORE	080\n" + "000 STORE  030\n" + "012 STORE	043\n"
				+ "013 STORE	052\n" + "014 STORE	061\n" + "015 STORE	070\n"
				+ "016 STORE	080\n" + "000 STORE  030\n" + "017 STORE	044\n"
				+ "018 STORE	053\n" + "019 STORE	062\n" + "020 STORE	071\n"
				+ "021 STORE	080\n" + "000 STORE  030\n" + "022 STORE	045\n"
				+ "023 STORE	054\n" + "024 STORE	063\n" + "025 STORE	072\n"
				+ "026 STORE	080\n" + "000 STORE  030\n" + "027 STORE	046\n"
				+ "028 STORE	055\n" + "029 STORE	064\n" + "030 STORE	073\n"
				+ "031 STORE	080\n" + "000 STORE  030\n" + "032 STORE	047\n"
				+ "033 STORE	056\n" + "034 STORE	065\n" + "035 STORE	074\n"
				+ "036 STORE	080\n" + "000 STORE  030\n" + "037 STORE	048\n"
				+ "038 STORE	057\n" + "039 STORE	066\n" + "040 STORE	075\n"
				+ "041 STORE	080\n" + "000 STORE  030\n" + "042 STORE	049\n"
				+ "043 STORE	058\n" + "044 STORE	067\n" + "045 STORE	076\n"
				+ "041 STORE	080\n" + "000 STORE  030\n" + "000 STORE  059\n"
				+ "048 STORE	068\n" + "049 STORE	077\n" + "050 STORE	080\n"
				+ "000 STORE  030\n" + "051 STORE	069\n" + "052 STORE	078\n"
				+ "053 STORE	080\n" + "054 STORE	079\n" + "055 STORE	080\n"
				+ "000 STORE  030\n" + "056 ADD	001\n" + "058 COMPare	127\n"
				+ "059 JmpEQual	000\n" + "060 JmpLess	001\n" + "061 BRK");
	} else if (n == 6) {
		processLoadFile(undefined, "000 LOAD	040\n" + "001 STORE	000\n"
				+ "002 LOAD	033\n" + "003 STORE	001\n" + "004 LOAD_AT	001\n"
				+ "005 STORE_AT	000\n" + "006 STORE	080\n" + "007 STORE  030\n"
				+ "008 INC_AT	000\n" + "009 LOAD_AT	000\n"
				+ "010 COMPare	080\n" + "011 JmpEQual	014\n"
				+ "012 JmpLess	004\n" + "013 BRK\n" + "014 INC_AT	001\n"
				+ "015 LOAD_AT	001\n" + "016 STORE_AT	000\n"
				+ "017 STORE	080\n" + "018 STORE   030\n" + "019 DEC_AT	000\n"
				+ "020 LOAD_AT	000\n" + "021 COMPare	039\n"
				+ "022 JmpEQual	025\n" + "023 Jump	015\n" + "024 BRK\n"
				+ "025 INC_AT	001\n" + "026 LOAD_AT	001\n"
				+ "027 COMPare	127\n" + "028 JmpLess	004\n" + "029 Jump	000\n"
				+ "030 BRK");
	} else if (n == 7) {
		processLoadFile(undefined, "000 LOAD	040\n" + "001 STORE	000\n"
				+ "002 LOAD	041\n" + "003 STORE	001\n" + "004 LOAD	042\n"
				+ "005 STORE	002\n" + "006 Jump	008\n" + "007 BRK\n"
				+ "008 LOAD	033\n" + "009 STORE_AT	002\n" + "010 LOAD	073\n"
				+ "011 STORE_AT	001\n" + "012 LOAD	072\n"
				+ "013 STORE_AT	000\n" + "014 STORE	080\n" + "015 STORE	030\n"
				+ "016 LOAD	032\n" + "017 STORE_AT	000\n" + "018 INC_AT	000\n"
				+ "019 INC_AT	001\n" + "020 INC_AT	002\n" + "021 LOAD_AT	002\n"
				+ "022 COMPare	050\n" + "023 JmpEQual	032\n"
				+ "024 LOAD_AT	001\n" + "025 COMPare	050\n"
				+ "026 JmpEQual	036\n" + "027 LOAD_AT	000\n"
				+ "028 COMPare	050\n" + "029 JmpEQual	040\n" + "030 Jump	008\n"
				+ "031 BRK\n" + "032 LOAD	040\n" + "033 STORE	002\n"
				+ "034 Jump	008\n" + "035 BRK\n" + "036 LOAD	040\n"
				+ "037 STORE	001\n" + "038 Jump	008\n" + "039 BRK\n"
				+ "040 LOAD	040\n" + "041 STORE	000\n" + "042 Jump	008\n"
				+ "043 BRK");
	} else if (n == 8) {
		processLoadFile(undefined, "000 LOAD	048\n" + "001 STORE	052\n"
				+ "002 STORE	053\n" + "003 STORE	054\n" + "004 STORE	080\n"
				+ "005 Jump	007\n" + "006 BRK\n" + "007 INC_AT	054\n"
				+ "008 STORE	080\n" + "009 STORE	030\n" + "010 LOAD_AT	054\n"
				+ "011 COMPare	057\n" + "012 JmpEQual	015\n"
				+ "013 JmpLess	007\n" + "014 BRK\n" + "015 LOAD	048\n"
				+ "016 STORE	054\n" + "017 INC_AT	053\n" + "018 LOAD_AT	053\n"
				+ "019 COMPare	058\n" + "020 JmpEQual	025\n"
				+ "021 STORE	080\n" + "022 STORE	030\n" + "023 JmpLess	007\n"
				+ "024 BRK\n" + "025 LOAD	048\n" + "026 STORE	054\n"
				+ "027 STORE	053\n" + "028 INC_AT	052\n" + "029 LOAD_AT	052\n"
				+ "030 COMPare	058\n" + "031 JmpEQual	000\n"
				+ "032 STORE	080\n" + "033 STORE	030\n" + "034 JmpLess	007\n"
				+ "035 BRK");
	}
}

//=======================================================================
function closeDebug() {
	isdebug = false;
}

//=======================================================================
function initDebugging() {
	runProgram(true);

	//init the display area of the debugger
	lastMemUpdate = -1;

	var linenum;
	for ( var i = 1; i <= 26; i++) {
		if ((i - 1) < 10)
			linenum = "0" + (i - 1) + "0";
		else
			linenum = (i - 1) + "0";
		if (i != 26)
			document.getElementById('l' + i).innerHTML = "<b>" + linenum
					+ "</b> 000 000 000 000 000 000 000 000 000 000";
		else
			document.getElementById('l' + i).innerHTML = "<b>" + linenum
					+ "</b> 000 000 000 000 000 000";
	}
	isdebug = true;
	executeOneLine();
}

//=======================================================================
function executeOneLine() {
	document.getElementsByClassName('pc')[0].innerHTML = "<b>Curr. Line</b>: <br>"
			+ (cline);
	document.getElementsByClassName('acc')[0].innerHTML = "<b>Accumulator</b>:<br>"
			+ accumulator;
	if (result == 0)
		document.getElementsByClassName('result')[0].innerHTML = "<b>Result</b>:<br>Equal";
	if (result == 1)
		document.getElementsByClassName('result')[0].innerHTML = "<b>Result</b>:<br>Less";
	else
		document.getElementsByClassName('result')[0].innerHTML = "<b>Result</b>:<br>More";
	document.getElementsByClassName('ins')[0].innerHTML = "<b>Opcode</b>:<br>"
			+ getInstruction(strLine[cline]);
	document.getElementsByClassName('val')[0].innerHTML = "<b>Value</b>:<br>"
			+ getValue(strLine[cline]);
	setCline();
	updateMemCellDisplay();
	executeCommands();
}

//=======================================================================
function updateMemCellDisplay() {
	if (lastMemUpdate == -1)
		return 0;
	var tm = lastMemUpdate, str, v, cv, vtext = " ";
	tm = (tm / 10);
	tm = Math.floor(tm);
	str = document.getElementById("l" + (tm + 1)).innerHTML;
	v = str.substring(0, 10);

	for ( var i = 0; i < 10; i++) {
		cv = memory[(tm * 10) + i]; //cv is the actual value stored in the memory
		if (cv <= 9)
			vtext += "00" + cv + " ";
		else if (cv <= 99)
			vtext += "0" + cv + " ";
		else
			vtext += "" + cv + " ";
	}

	document.getElementById("l" + (tm + 1)).innerHTML = v + vtext;
}

//=======================================================================

function setCline() {
	el_progcode.getElementsByTagName('pre')[cline].className = "active";
	try {
		el_progcode.getElementsByTagName('pre')[cline - 1].className = "";
	} catch (err) {
	}
	if (cline > 4) {

		var el = el_progcode.getElementsByTagName('pre')[0];
		var style = window.getComputedStyle(el, null).getPropertyValue(
				'font-size');
		var fontSize = parseFloat(style);

		el_progcode.scrollTop = ((cline - 4) * 0.985) * (fontSize * 1.17);
	} else
		el_progcode.scrollTop = 0;

	//console.log (     parseInt( el_progcode.getElementsByTagName('pre')[1].style.fontSize) );
}
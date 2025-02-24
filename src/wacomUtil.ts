/* eslint-disable */
// @ts-nocheck

import WacomGSS from './wgssStuSdk'
import Q from 'q'
// import { encryptionHandler, encryptionHandler2 } from './encryption'
import 'big-integer'


function includeJs(jsFilePath) {
  var js = document.createElement("script");

  js.type = "text/javascript";
  js.src = jsFilePath;

  document.body.appendChild(js);
}

function includeCSS(cssFilePath) {
  var cssFile = document.createElement("link");

  cssFile.rel = "stylesheet";
  cssFile.href = cssFilePath;

  document.head.appendChild(cssFile);
}

let m_clickBtn = -1;
let intf;
var formDiv: HTMLDivElement;
let protocol;
let m_usbDevices: any;
let tablet: any;
let m_capability: {
  screenWidth: number;
  screenHeight: number;
  encodingFlag: any;
  tabletMaxX: number;
  tabletMaxY: number;
};
let m_inkThreshold: { offPressureMark: number; onPressureMark: number };
let m_imgData: { remove: () => any } | null;
let m_encodingMode: any;
let ctx: any;
let canvas: any;
let modalBackground: HTMLDivElement;
let m_penData: any[];
let lastPoint: any;
let isDown: boolean;
let base64image: string;
let propFunction: (arg0: string) => void;
let m_btns: any;
let parentWrapper = '';
let retry = 0;
function checkForSigCaptX() {
  // Establishing a connection to SigCaptX Web Service can take a few seconds,
  // particularly if the browser itself is still loading/initialising
  // or on a slower machine.
  retry += 1;
  if (WacomGSS.STU.isServiceReady()) {
    retry = 0;
  } else {
    if (retry < 20) {
      setTimeout(checkForSigCaptX, 1000);
    } else {
      console.error("Unable to establish connection to SigCaptX");
    }
  }
}

setTimeout(checkForSigCaptX, 500);

function onDCAtimeout() {
  // Device Control App has timed-out and shut down
  // For this sample, we just closedown tabletDemo (assumking it's running)
  console.log("DCA disconnected");
  setTimeout(close, 0);
}

class Rectangle {
  x: any;
  y: any;
  width: any;
  height: any;
  Contains: (pt: { x: number; y: number }) => boolean;
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.Contains = function (pt: { x: number; y: number }) {
      if (
        pt.x >= this.x &&
        pt.x <= this.x + this.width &&
        pt.y >= this.y &&
        pt.y <= this.y + this.height
      ) {
        return true;
      }
      return false;
    };
  }
}

// In order to simulate buttons, we have our own Button class that stores the bounds and event handler.
// Using an array of these makes it easy to add or remove buttons as desired.
//  delegate void ButtonClick();
class Button {
  Bounds: any;
  Text: any;
  Click: any;
  constructor() {
    this.Bounds;
    this.Text;
    this.Click;
  }
}

function Point(this: any, x: number, y: number) {
  this.x = x;
  this.y = y;
}

function createModalWindow(width: number, height: number, wrapperClass: any) {
  modalBackground = document.createElement("div");
  modalBackground.id = "modal-background";
  modalBackground.className = "active";
  modalBackground.style.width = window.innerWidth + "";
  modalBackground.style.height = window.innerHeight + "";
  document.getElementsByTagName("body")[0].appendChild(modalBackground);

  formDiv = document.createElement("div");
  formDiv.id = "signatureWindow";
  formDiv.className = "active";
  formDiv.style.top = "50%";
  formDiv.style.left = "50%";
  formDiv.style.width = `${width}px`;
  formDiv.style.height = `${height}px`;
  formDiv.style.zIndex = "1001";
  formDiv.style.transform = "translate(-50%, -50%)";
  document.getElementsByClassName(wrapperClass)[0].appendChild(formDiv);

  canvas = document.createElement("canvas");
  canvas.id = "myCanvas";
  canvas.height = formDiv.offsetHeight;
  canvas.width = formDiv.offsetWidth;
  canvas.style.border = "thin solid black";
  formDiv.appendChild(canvas);
  ctx = canvas.getContext("2d");

  if (canvas.addEventListener) {
    canvas.addEventListener("click", onCanvasClick, false);
  } else if (canvas.attachEvent) {
    canvas.attachEvent("onClick", onCanvasClick);
  } else {
    canvas.onClick = onCanvasClick;
  }
}

function disconnect() {
  const deferred = Q.defer();
  if (!(undefined === tablet || tablet === null)) {
    const p = new WacomGSS.STU.Protocol();
    tablet
      .setInkingMode(p.InkingMode.InkingMode_Off)
      .then((message: any) => {
        return tablet.endCapture();
      })
      .then((message: any) => {
        if (m_imgData !== null) {
          return m_imgData.remove();
        }
        return message;
      })
      .then((message: any) => {
        m_imgData = null;
        return tablet.setClearScreen();
      })
      .then((message: any) => {
        return tablet.disconnect();
      })
      .then((message: any) => {
        tablet = null;
        // clear canvas
        clearCanvas(canvas, ctx);
      })
      .then((message: any) => {
        deferred.resolve();
      })
      .fail((message: any) => {
        console.log(`disconnect error: ${message}`);
        deferred.resolve();
      });
  } else {
    deferred.resolve();
  }
  return deferred.promise;
}

// window.addEventListener("beforeunload", (e) => {
//   const confirmationMessage = "";
//   WacomGSS.STU.close();
//   (e || window.event).returnValue = confirmationMessage; // Gecko + IE
//   return confirmationMessage; // Webkit, Safari, Chrome
// });

// Error-derived object for Device Control App not ready exception
function DCANotReady() {}
DCANotReady.prototype = new Error();

function tabletDemo(passToProps: (string: any) => void, wrapperClass) {
  parentWrapper = wrapperClass;
  propFunction = passToProps;
  const p = new WacomGSS.STU.Protocol();
  let intf: any;
  let m_usingEncryption = false;
  let m_encH: { Constructor: () => any };
  let m_encH2: { Constructor: () => any };
  let m_encH2Impl: { error: any };

  WacomGSS.STU.isDCAReady()
    .then((message: any) => {
      if (!message) {
        throw DCANotReady();
      }
      // Set handler for Device Control App timeout
      WacomGSS.STU.onDCAtimeout = onDCAtimeout;

      return WacomGSS.STU.getUsbDevices();
    })
    .then((message: string | any[] | null) => {
      if (message == null || message.length == 0) {
        throw new Error("No STU devices found");
      }

      m_usbDevices = message;
      return WacomGSS.STU.isSupportedUsbDevice(
        m_usbDevices[0].idVendor,
        m_usbDevices[0].idProduct
      );
    })
    .then((message: any) => {
      intf = new WacomGSS.STU.UsbInterface();
      return intf.Constructor();
    })
    .then((message: any) => {
      return intf.connect(m_usbDevices[0], true);
    })
    // .then((message: { value: number }) => {
    //   console.log(message.value == 0 ? "connected!" : "not connected");
    //   if (message.value == 0) {
    //     m_encH = new WacomGSS.STU.EncryptionHandler(new encryptionHandler());
    //     return m_encH.Constructor();
    //   }
    // })
    // .then((message: any) => {
    //   m_encH2Impl = new encryptionHandler2();
    //   m_encH2 = new WacomGSS.STU.EncryptionHandler2(m_encH2Impl);
    //   return m_encH2.Constructor();
    // })
    .then((message: any) => {
      tablet = new WacomGSS.STU.Tablet();
      return tablet.Constructor(intf, m_encH, m_encH2);
    })
    .then((message: any) => {
      intf = null;
      return tablet.getInkThreshold();
    })
    .then((message: any) => {
      m_inkThreshold = message;
      return tablet.getCapability();
    })
    .then((message: any) => {
      m_capability = message;
      createModalWindow(m_capability.screenWidth, m_capability.screenHeight, wrapperClass);
      return tablet.getInformation();
    })
    .then((message: any) => {
      return tablet.getInkThreshold();
    })
    .then((message: any) => {
      return tablet.getProductId();
    })
    .then((message: any) => {
      return WacomGSS.STU.ProtocolHelper.simulateEncodingFlag(
        message,
        m_capability.encodingFlag
      );
    })
    .then((message: any) => {
      const encodingFlag = message;
      if ((encodingFlag & p.EncodingFlag.EncodingFlag_24bit) != 0) {
        return tablet.supportsWrite().then((message: any) => {
          m_encodingMode = message
            ? p.EncodingMode.EncodingMode_24bit_Bulk
            : p.EncodingMode.EncodingMode_24bit;
        });
      }
      if ((encodingFlag & p.EncodingFlag.EncodingFlag_16bit) != 0) {
        return tablet.supportsWrite().then((message: any) => {
          m_encodingMode = message
            ? p.EncodingMode.EncodingMode_16bit_Bulk
            : p.EncodingMode.EncodingMode_16bit;
        });
      }
      // assumes 1bit is available
      m_encodingMode = p.EncodingMode.EncodingMode_1bit;
    })
    .then((message: any) => {
      return tablet.isSupported(p.ReportId.ReportId_EncryptionStatus); // v2 encryption
    })
    .then((message: boolean) => {
      m_usingEncryption = message;
      if (typeof window.sjcl == "undefined") {
        m_usingEncryption = false;
      }
      // if the encryption script is missing turn off encryption regardless
      return tablet.getDHprime();
    })
    .then((dhPrime: any) => {
      return WacomGSS.STU.ProtocolHelper.supportsEncryption_DHprime(dhPrime); // v1 encryption
    })
    .then((message: any) => {
      m_usingEncryption = message ? true : m_usingEncryption;
      return tablet.setClearScreen();
    })
    .then((message: any) => {
      if (m_usingEncryption) {
        return tablet.startCapture(0xc0ffee);
      }
      return message;
    })
    // .then((message: any) => {
    //   if (typeof m_encH2Impl.error !== "undefined") {
    //     throw new Error("Encryption failed, restarting demo");
    //   }
    //   return message;
    // })
    .then((message: any) => {
      return tablet.isSupported(p.ReportId.ReportId_PenDataOptionMode);
    })
    .then((message: any) => {
      if (message) {
        return tablet.getProductId().then((message: any) => {
          let penDataOptionMode = p.PenDataOptionMode.PenDataOptionMode_None;
          switch (message) {
            case WacomGSS.STU.ProductId.ProductId_520A:
              penDataOptionMode =
                p.PenDataOptionMode.PenDataOptionMode_TimeCount;
              break;
            case WacomGSS.STU.ProductId.ProductId_430:
            case WacomGSS.STU.ProductId.ProductId_530:
              penDataOptionMode =
                p.PenDataOptionMode.PenDataOptionMode_TimeCountSequence;
              break;
            default:
          }
          return tablet.setPenDataOptionMode(penDataOptionMode);
        });
      }
      m_encodingMode = p.EncodingMode.EncodingMode_1bit;
      return m_encodingMode;
    })
    .then((message: any) => {
      addButtons(wrapperClass);
      const canvasImage = canvas.toDataURL("image/jpeg");
      return WacomGSS.STU.ProtocolHelper.resizeAndFlatten(
        canvasImage,
        0,
        0,
        0,
        0,
        m_capability.screenWidth,
        m_capability.screenHeight,
        m_encodingMode,
        1,
        false,
        0,
        true
      );
    })
    .then((message: any) => {
      m_imgData = message;

      return tablet.writeImage(m_encodingMode, message);
    })
    // .then((message: any) => {
    //   if (m_encH2Impl.error) {
    //     throw new Error("Encryption failed, restarting demo");
    //   }
    //   return message;
    // })
    .then((message: any) => {
      return tablet.setInkingMode(p.InkingMode.InkingMode_On);
    })
    .then((message: any) => {
      const reportHandler = new WacomGSS.STU.ProtocolHelper.ReportHandler();
      lastPoint = { x: 0, y: 0 };
      isDown = false;
      ctx.lineWidth = 1;

      const penData = function (report: any) {
        // console.log("report: " + JSON.stringify(report));
        m_penData.push(report);
        processButtons(report, canvas);
        processPoint(report, canvas, ctx);
      };
      const penDataEncryptedOption = function (report: { penData: any[] }) {
        // console.log("reportOp: " + JSON.stringify(report));
        m_penData.push(report.penData[0], report.penData[1]);
        processButtons(report.penData[0], canvas);
        processPoint(report.penData[0], canvas, ctx);
        processButtons(report.penData[1], canvas);
        processPoint(report.penData[1], canvas, ctx);
      };

      const log = function (report: any) {
        // console.log("report: " + JSON.stringify(report));
      };

      const decrypted = function (report: any) {
        // console.log("decrypted: " + JSON.stringify(report));
      };
      m_penData = new Array();
      reportHandler.onReportPenData = penData;
      reportHandler.onReportPenDataOption = penData;
      reportHandler.onReportPenDataTimeCountSequence = penData;
      reportHandler.onReportPenDataEncrypted = penDataEncryptedOption;
      reportHandler.onReportPenDataEncryptedOption = penDataEncryptedOption;
      reportHandler.onReportPenDataTimeCountSequenceEncrypted = penData;
      reportHandler.onReportDevicePublicKey = log;
      reportHandler.onReportEncryptionStatus = log;
      reportHandler.decrypt = decrypted;
      return reportHandler.startReporting(tablet, true);
    })
    .fail((ex: any) => {
      console.log(ex);

      if (ex instanceof DCANotReady) {
        // Device Control App not detected
        // Reinitialize and re-try
        WacomGSS.STU.Reinitialize();
        setTimeout(tabletDemo, 1000);
      } else {
        // Some other error - Inform the user and closedown
        alert(`wacom sigpad failed:\n${ex}`);
        setTimeout(() => close(wrapperClass), 0);
      }
    });
}
function addButtons(wrapperClass) {
  m_btns = new Array(3);
  m_btns[0] = new Button();
  m_btns[1] = new Button();
  m_btns[2] = new Button();

  if (m_usbDevices[0].idProduct != WacomGSS.STU.ProductId.ProductId_300) {
    // Place the buttons across the bottom of the screen.
    const w2 = m_capability.screenWidth / 3;
    const w3 = m_capability.screenWidth / 3;
    const w1 = m_capability.screenWidth - w2 - w3;
    const y = (m_capability.screenHeight * 6) / 7;
    const h = m_capability.screenHeight - y;

    m_btns[0].Bounds = new Rectangle(0, y, w1, h);
    m_btns[1].Bounds = new Rectangle(w1, y, w2, h);
    m_btns[2].Bounds = new Rectangle(w1 + w2, y, w3, h);
  } else {
    // The STU-300 is very shallow, so it is better to utilise
    // the buttons to the side of the display instead.

    const x = (m_capability.screenWidth * 3) / 4;
    const w = m_capability.screenWidth - x;

    const h2 = m_capability.screenHeight / 3;
    const h3 = m_capability.screenHeight / 3;
    const h1 = m_capability.screenHeight - h2 - h3;

    m_btns[0].Bounds = new Rectangle(x, 0, w, h1);
    m_btns[1].Bounds = new Rectangle(x, h1, w, h2);
    m_btns[2].Bounds = new Rectangle(x, h1 + h2, w, h3);
  }

  m_btns[0].Text = "OK";
  m_btns[1].Text = "Clear";
  m_btns[2].Text = "Cancel";
  m_btns[0].Click = btnOk_Click;
  m_btns[1].Click = btnClear_Click;
  m_btns[2].Click = btnCancel_Click;
  clearCanvas(canvas, ctx);
  drawButtons();
}

function drawButtons() {
  // This application uses the same bitmap for both the screen and client (window).

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";
  ctx.font = "30px Arial";

  // Draw the buttons
  for (let i = 0; i < m_btns.length; ++i) {
    // if (useColor)
    {
      ctx.fillStyle = "lightgrey";
      ctx.fillRect(
        m_btns[i].Bounds.x,
        m_btns[i].Bounds.y,
        m_btns[i].Bounds.width,
        m_btns[i].Bounds.height
      );
    }

    ctx.fillStyle = "black";
    ctx.rect(
      m_btns[i].Bounds.x,
      m_btns[i].Bounds.y,
      m_btns[i].Bounds.width,
      m_btns[i].Bounds.height
    );
    const xPos =
      m_btns[i].Bounds.x +
      (m_btns[i].Bounds.width / 2 - ctx.measureText(m_btns[i].Text).width / 2);
    var yOffset;
    if (m_usbDevices[0].idProduct == WacomGSS.STU.ProductId.ProductId_300) {
      yOffset = 28;
    } else if (
      m_usbDevices[0].idProduct == WacomGSS.STU.ProductId.ProductId_430
    ) {
      yOffset = 26;
    } else yOffset = 40;
    ctx.fillText(m_btns[i].Text, xPos, m_btns[i].Bounds.y + yOffset);
  }
  ctx.stroke();
  ctx.closePath();

  ctx.restore();
}

function clearScreen() {
  clearCanvas(canvas, ctx);
  drawButtons();
  m_penData = new Array();
  tablet.writeImage(m_encodingMode, m_imgData);
}

function btnOk_Click() {
  // You probably want to add additional processing here.
  generateImage();
  setTimeout(close, 0);
}

function btnCancel_Click() {
  // You probably want to add additional processing here.
  setTimeout(close, 0);
}

function btnClear_Click() {
  // You probably want to add additional processing here.
  clearScreen();
}

function distance(a: { x: number; y: number }, b: { x?: any; y?: any }) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function clearCanvas(
  in_canvas: HTMLCanvasElement,
  in_ctx: CanvasRenderingContext2D
) {
  in_ctx.save();
  in_ctx.setTransform(1, 0, 0, 1, 0, 0);
  in_ctx.fillStyle = "white";
  in_ctx.fillRect(0, 0, in_canvas.width, in_canvas.height);
  in_ctx.restore();
}

function processButtons(
  point: { x: number; y: number; pressure: number },
  in_canvas: { width: number; height: number }
) {
  const nextPoint: any = {};
  nextPoint.x = Math.round(
    (in_canvas.width * point.x) / m_capability.tabletMaxX
  );
  nextPoint.y = Math.round(
    (in_canvas.height * point.y) / m_capability.tabletMaxY
  );
  const isDown2 = isDown
    ? !(point.pressure <= m_inkThreshold.offPressureMark)
    : point.pressure > m_inkThreshold.onPressureMark;

  let btn = -1;
  for (let i = 0; i < m_btns.length; ++i) {
    if (m_btns[i].Bounds.Contains(nextPoint)) {
      btn = i;
      break;
    }
  }

  if (isDown && !isDown2) {
    if (btn != -1 && m_clickBtn === btn) {
      m_btns[btn].Click();
    }
    m_clickBtn = -1;
  } else if (btn != -1 && !isDown && isDown2) {
    m_clickBtn = btn;
  }
  return btn == -1;
}

function processPoint(
  point: { x: number; y: number; pressure: number },
  in_canvas: HTMLCanvasElement,
  in_ctx: any
) {
  const nextPoint: any = {};
  nextPoint.x = Math.round(
    (in_canvas.width * point.x) / m_capability.tabletMaxX
  );
  nextPoint.y = Math.round(
    (in_canvas.height * point.y) / m_capability.tabletMaxY
  );
  const isDown2 = isDown
    ? !(point.pressure <= m_inkThreshold.offPressureMark)
    : point.pressure > m_inkThreshold.onPressureMark;

  if (!isDown && isDown2) {
    lastPoint = nextPoint;
  }

  if (
    (isDown2 && distance(lastPoint, nextPoint) > 10) ||
    (isDown && !isDown2)
  ) {
    in_ctx.beginPath();
    in_ctx.moveTo(lastPoint.x, lastPoint.y);
    in_ctx.lineTo(nextPoint.x, nextPoint.y);
    in_ctx.stroke();
    in_ctx.closePath();
    lastPoint = nextPoint;
  }

  isDown = isDown2;
}

function generateImage() {
  const signatureCanvas = document.createElement("canvas");
  signatureCanvas.id = "signatureCanvas";
  signatureCanvas.height = 120;
  signatureCanvas.width = 320;
  const signatureCtx: any = signatureCanvas.getContext("2d");

  clearCanvas(signatureCanvas, signatureCtx);
  signatureCtx.lineWidth = 1;
  signatureCtx.strokeStyle = "black";
  lastPoint = { x: 0, y: 0 };
  isDown = false;
  for (let i = 0; i < m_penData.length; i++) {
    processPoint(m_penData[i], signatureCanvas, signatureCtx);
  }
  base64image = signatureCanvas.toDataURL("image/jpeg");
  propFunction(base64image);
  base64image = "";
}

function close() {
  // Clear handler for Device Control App timeout
  let close
  if (parentWrapper !== '') {
      close = parentWrapper
  } else {
      close = "body"
  }
  WacomGSS.STU.onDCAtimeout = null;

  disconnect();
  document.getElementsByTagName("body")[0].removeChild(modalBackground);
  document.getElementsByClassName(close)[0].removeChild(formDiv);
}

function onCanvasClick(event: { pageX: number; pageY: number }) {
  // Enable the mouse to click on the simulated buttons that we have displayed.

  // Note that this can add some tricky logic into processing pen data
  // if the pen was down at the time of this click, especially if the pen was logically
  // also 'pressing' a button! This demo however ignores any that.

  const posX = event.pageX - formDiv.offsetLeft;
  const posY = event.pageY - formDiv.offsetTop;

  for (let i = 0; i < m_btns.length; i++) {
    if (m_btns[i].Bounds.Contains(new Point(posX, posY))) {
      m_btns[i].Click();
      break;
    }
  }
}

export { base64image, tabletDemo };

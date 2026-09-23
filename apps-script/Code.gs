/**
 * Sablonin - Google Sheets + Drive backend (gratis, lewat Google Apps Script).
 * Cara pasang: lihat SETUP_SHEETS.md di root folder proyek.
 */

var SHEET_ORDERS = "Orders";
var SHEET_VIEWS = "Views";
var FOLDER_NAME = "Sablonin Uploads";

var ORDER_HEADERS = [
  "id", "createdAt", "size", "sizeLabel", "shirtSize", "shirtSizeLabel", "sleeveLong",
  "qty", "contourCut", "catatan",
  "nama", "email", "wa", "total", "shirtColorHex",
  "placementView", "placementX", "placementY", "placementScale", "placementRotation",
  "designFileUrl", "proofFileUrl", "ocrMatch", "status"
];

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function getUploadFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

function saveBase64File_(dataUrl, filename) {
  if (!dataUrl) return "";
  var match = String(dataUrl).match(/^data:(.+);base64,(.*)$/);
  if (!match) return "";
  var blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1], filename);
  var file = getUploadFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function findRowById_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function doPost(e) {
  var result = { ok: false };
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);

    if (action === "createOrder") {
      var designUrl = saveBase64File_(body.designDataUrl, body.id + "-desain");
      var p = body.placement || {};
      sheet.appendRow([
        body.id, body.createdAt, body.size, body.sizeLabel, body.shirtSize, body.shirtSizeLabel, body.sleeveLong,
        body.qty, body.contourCut, body.catatan,
        body.nama, body.email, body.wa, body.total, body.shirtColorHex,
        p.view, p.x, p.y, p.scale, p.rotation,
        designUrl, "", "", "menunggu_pembayaran"
      ]);
      result = { ok: true };

    } else if (action === "updateProof") {
      var row = findRowById_(sheet, body.id);
      if (row > 0) {
        var proofUrl = saveBase64File_(body.proofDataUrl, body.id + "-bukti");
        if (proofUrl) sheet.getRange(row, ORDER_HEADERS.indexOf("proofFileUrl") + 1).setValue(proofUrl);
        sheet.getRange(row, ORDER_HEADERS.indexOf("status") + 1).setValue("menunggu_verifikasi");
      }
      result = { ok: row > 0 };

    } else if (action === "updateOcr") {
      var rowOcr = findRowById_(sheet, body.id);
      if (rowOcr > 0) {
        sheet.getRange(rowOcr, ORDER_HEADERS.indexOf("ocrMatch") + 1).setValue(body.ocrMatch);
      }
      result = { ok: rowOcr > 0 };

    } else if (action === "updateStatus") {
      var row2 = findRowById_(sheet, body.id);
      if (row2 > 0) {
        sheet.getRange(row2, ORDER_HEADERS.indexOf("status") + 1).setValue(body.status);
      }
      result = { ok: row2 > 0 };

    } else if (action === "trackView") {
      getSheet_(SHEET_VIEWS, ["timestamp"]).appendRow([body.timestamp || new Date().toISOString()]);
      result = { ok: true };

    } else {
      result = { ok: false, error: "unknown action: " + action };
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ordersSheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  var viewsSheet = getSheet_(SHEET_VIEWS, ["timestamp"]);

  var orderRows = ordersSheet.getDataRange().getValues();
  var orders = [];
  for (var i = 1; i < orderRows.length; i++) {
    var row = orderRows[i];
    var obj = {};
    ORDER_HEADERS.forEach(function (h, idx) { obj[h] = row[idx]; });
    orders.push(obj);
  }

  var viewRows = viewsSheet.getDataRange().getValues();
  var views = [];
  for (var j = 1; j < viewRows.length; j++) views.push(viewRows[j][0]);

  return ContentService.createTextOutput(JSON.stringify({ orders: orders, views: views }))
    .setMimeType(ContentService.MimeType.JSON);
}

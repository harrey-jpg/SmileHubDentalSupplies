const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync('js/report-utils.js', 'utf8'), context);
const reports = context.window.SmileHubReportUtils;

const orders = [
  {
    number: 'SH-1', customer: '=SUM(1,1)', email: 'one@example.com', date: '2026-10-20',
    sortTs: new Date('2026-10-20T10:00:00Z').getTime(), status: 'Delivered', paymentStatus: 'paid', total: 400.005,
    items: [{ name: 'ProClean, "Soft"', quantity: 2, price: 189 }]
  },
  {
    number: 'SH-2', customer: 'Second customer', email: 'two@example.com', date: '2026-10-21',
    sortTs: new Date('2026-10-21T10:00:00Z').getTime(), status: 'Pending', paymentStatus: 'unpaid', total: 100,
    items: [{ name: '<script>alert(1)</script>', quantity: 1, price: 100 }]
  },
  {
    number: 'SH-3', customer: 'Cancelled customer', status: 'cancelled', total: 50,
    items: [{ name: 'Excluded product', quantity: 1, price: 50 }]
  },
  {
    number: 'SH-4', customer: 'Refunded customer', status: 'Refunded', paymentStatus: 'paid', total: 75,
    items: [{ name: 'Excluded product', quantity: 1, price: 75 }]
  }
];

const model = reports.buildModel(orders, 'ProClean, "Soft"');
assert.equal(model.totalOrders, 4);
assert.equal(model.activeOrderCount, 2);
assert.equal(model.totalRevenue, 500.01);
assert.equal(model.averageOrderValue, 250.01);
assert.equal(model.itemsSold, 3);
assert.equal(model.confirmedPaid, 400.01);
assert.equal(model.notConfirmed, 100);
assert.equal(model.productRows.length, 1);
assert.equal(model.productRows[0].orders, 1);
assert.equal(model.productRows[0].units, 2);
assert.equal(model.productRows[0].value, 378);
assert.equal(model.topCustomers.length, 2);
const fractionalPriceModel = reports.buildModel([{
  status: 'Delivered', total: 20.01,
  items: [{ name: 'Fractional unit price', quantity: 2, price: 10.005 }]
}]);
assert.equal(fractionalPriceModel.productRows[0].value, 20.01);

const csv = reports.buildCsv(orders, {
  periodLabel: 'Oct 20 – Oct 21, 2026',
  productKey: 'ProClean, "Soft"',
  selectedProduct: 'ProClean, "Soft"',
  generatedAt: 'fixed test time'
});
assert.match(csv, /"Period","Oct 20 – Oct 21, 2026"/);
assert.match(csv, /"'\=SUM\(1,1\)"/);
assert.match(csv, /"ProClean, ""Soft""","1","2","378\.00"/);
assert.match(csv, /"Item value"/);
const productSection = csv.split('"Sales by Product"')[1].split('"Payment by Month"')[0];
assert.doesNotMatch(productSection, /Excluded product/);

const printable = reports.buildPrintHtml(orders, {
  periodLabel: 'All Time', selectedProduct: 'All products', generatedAt: 'fixed test time'
});
assert.match(printable, /@page\{size:A4/);
assert.match(printable, /Order Detail/);
assert.match(printable, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(printable, /<script>alert\(1\)<\/script>/);
assert.match(printable, /PHP 500\.01/);

console.log('Report utilities: totals, terminal-order exclusion, product filtering, CSV quoting, and print HTML passed.');

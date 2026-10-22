(function(root) {
  'use strict';

  function roundMoney(value) {
    var amount = Number(value);
    return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
  }

  function formatMoney(value) {
    return roundMoney(value).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function isActiveOrder(order) {
    var status = String(order && order.status || '').trim().toLowerCase();
    return ['cancelled', 'canceled', 'returned', 'refunded'].indexOf(status) === -1;
  }

  function isPaidOrder(order) {
    return isActiveOrder(order) && String(order.paymentStatus || '').toLowerCase() === 'paid';
  }

  function orderTime(order) {
    if (Number(order && order.sortTs)) return Number(order.sortTs);
    if (order && order.createdAt && typeof order.createdAt.toDate === 'function') {
      try { return order.createdAt.toDate().getTime(); } catch (e) {}
    }
    var time = order && order.date ? Date.parse(order.date) : NaN;
    return Number.isFinite(time) ? time : 0;
  }

  function itemQuantity(item) {
    var quantity = Number(item && item.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  function buildModel(orders, selectedProduct) {
    orders = Array.isArray(orders) ? orders : [];
    var activeOrders = orders.filter(isActiveOrder);
    var totalRevenue = roundMoney(activeOrders.reduce(function(sum, order) {
      return sum + roundMoney(order.total);
    }, 0));
    var itemsSold = activeOrders.reduce(function(sum, order) {
      return sum + (Array.isArray(order.items) ? order.items.reduce(function(itemSum, item) {
        return itemSum + itemQuantity(item);
      }, 0) : 0);
    }, 0);

    var products = {};
    var seenOrders = {};
    activeOrders.forEach(function(order, orderIndex) {
      (Array.isArray(order.items) ? order.items : []).forEach(function(item) {
        var name = String(item && item.name || 'Unknown').trim() || 'Unknown';
        if (selectedProduct && selectedProduct !== 'all' && name !== selectedProduct) return;
        if (!products[name]) {
          products[name] = { name: name, orders: 0, units: 0, value: 0 };
          seenOrders[name] = {};
        }
        var qty = itemQuantity(item);
        products[name].units += qty;
        var unitPrice = Number(item && item.price);
        products[name].value = roundMoney(products[name].value + qty * (Number.isFinite(unitPrice) ? unitPrice : 0));
        var orderKey = String(order.number || order.orderNumber || order.docId || 'row-' + orderIndex);
        if (!seenOrders[name][orderKey]) {
          seenOrders[name][orderKey] = true;
          products[name].orders += 1;
        }
      });
    });

    var statusCounts = {};
    orders.forEach(function(order) {
      var status = String(order && order.status || 'Pending').trim() || 'Pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    var statusRows = Object.keys(statusCounts).map(function(status) {
      return { status: status, orders: statusCounts[status] };
    }).sort(function(a, b) { return b.orders - a.orders || a.status.localeCompare(b.status); });

    var monthly = {};
    orders.forEach(function(order) {
      var time = orderTime(order);
      if (!time) return;
      var date = new Date(time);
      var key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      if (!monthly[key]) monthly[key] = { month: key, confirmed: 0, notConfirmed: 0, orders: 0 };
      monthly[key].orders += 1;
      if (isActiveOrder(order)) {
        if (isPaidOrder(order)) monthly[key].confirmed = roundMoney(monthly[key].confirmed + roundMoney(order.total));
        else monthly[key].notConfirmed = roundMoney(monthly[key].notConfirmed + roundMoney(order.total));
      }
    });
    var monthlyRows = Object.keys(monthly).sort().map(function(key) { return monthly[key]; });

    var customers = {};
    activeOrders.forEach(function(order) {
      if (!order.customer && !order.email) return;
      var key = String(order.email || order.customer || 'Unknown').toLowerCase().trim();
      var label = String(order.customer || order.email || 'Unknown').trim();
      if (!customers[key]) customers[key] = { customer: label, orders: 0, value: 0 };
      customers[key].orders += 1;
      customers[key].value = roundMoney(customers[key].value + roundMoney(order.total));
    });
    var topCustomers = Object.keys(customers).map(function(key) { return customers[key]; })
      .sort(function(a, b) { return b.value - a.value || a.customer.localeCompare(b.customer); })
      .slice(0, 10)
      .map(function(customer) {
        return Object.assign({}, customer, {
          share: totalRevenue ? Math.round(customer.value / totalRevenue * 100) : 0
        });
      });

    var productRows = Object.keys(products).map(function(key) { return products[key]; })
      .sort(function(a, b) { return b.value - a.value || a.name.localeCompare(b.name); });
    var confirmedPaid = roundMoney(activeOrders.filter(isPaidOrder).reduce(function(sum, order) {
      return sum + roundMoney(order.total);
    }, 0));

    return {
      totalOrders: orders.length,
      activeOrderCount: activeOrders.length,
      totalRevenue: totalRevenue,
      averageOrderValue: activeOrders.length ? roundMoney(totalRevenue / activeOrders.length) : 0,
      itemsSold: itemsSold,
      confirmedPaid: confirmedPaid,
      notConfirmed: roundMoney(totalRevenue - confirmedPaid),
      statusRows: statusRows,
      monthlyRows: monthlyRows,
      topCustomers: topCustomers,
      productRows: productRows
    };
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value).replace(/[\r\n]+/g, ' ');
    if (/^[=+\-@\t]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function csvRows(rows) {
    return rows.map(function(row) { return row.map(csvCell).join(','); }).join('\r\n');
  }

  function buildCsv(orders, options) {
    options = options || {};
    var selectedProduct = options.selectedProduct || 'All products';
    var model = buildModel(orders, options.productKey || 'all');
    var rows = [
      ['SmileHub Sales Report'],
      ['Period', options.periodLabel || 'All Time'],
      ['Trend granularity', options.granularity || 'Automatic'],
      ['Product filter (Sales by Product only)', selectedProduct],
      ['Generated', options.generatedAt || new Date().toLocaleString()],
      [],
      ['Summary'],
      ['Orders (all statuses)', model.totalOrders],
      ['Active orders', model.activeOrderCount],
      ['Order value (excludes cancelled, returned, refunded)', formatMoney(model.totalRevenue)],
      ['Average active order value', formatMoney(model.averageOrderValue)],
      ['Units sold (active orders)', model.itemsSold],
      ['Confirmed paid', formatMoney(model.confirmedPaid)],
      ['Payment not confirmed', formatMoney(model.notConfirmed)],
      [],
      ['Order detail'],
      ['Order #', 'Customer', 'Date', 'Status', 'Total', 'Items']
    ];
    (Array.isArray(orders) ? orders : []).forEach(function(order) {
      var items = (Array.isArray(order.items) ? order.items : []).map(function(item) {
        return (item.name || 'Item') + ' x' + itemQuantity(item);
      }).join('; ');
      rows.push([
        order.number || order.orderNumber || order.docId || '',
        order.customer || order.email || '',
        order.date || '',
        order.status || 'Pending',
        formatMoney(order.total),
        items
      ]);
    });
    rows.push([], ['Sales by Product'], ['Product', 'Orders', 'Units sold', 'Item value']);
    model.productRows.forEach(function(product) {
      rows.push([product.name, product.orders, product.units, formatMoney(product.value)]);
    });
    rows.push([], ['Payment by Month'], ['Month', 'Confirmed paid', 'Payment not confirmed', 'Orders (all statuses)']);
    model.monthlyRows.forEach(function(month) {
      rows.push([month.month, formatMoney(month.confirmed), formatMoney(month.notConfirmed), month.orders]);
    });
    rows.push([], ['Top Customers (active orders only)'], ['Customer', 'Orders', 'Order value', 'Share of active order value']);
    model.topCustomers.forEach(function(customer) {
      rows.push([customer.customer, customer.orders, formatMoney(customer.value), customer.share + '%']);
    });
    rows.push([], ['Orders by Status'], ['Status', 'Orders']);
    model.statusRows.forEach(function(status) { rows.push([status.status, status.orders]); });
    return csvRows(rows);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function htmlTable(title, headers, rows) {
    var head = headers.map(function(value) { return '<th scope="col">' + escapeHtml(value) + '</th>'; }).join('');
    var body = rows.length ? rows.map(function(row) {
      return '<tr>' + row.map(function(value) { return '<td>' + escapeHtml(value) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + headers.length + '" class="empty">No data for this section.</td></tr>';
    return '<section><h2>' + escapeHtml(title) + '</h2><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></section>';
  }

  function buildPrintHtml(orders, options) {
    options = options || {};
    orders = Array.isArray(orders) ? orders : [];
    var model = buildModel(orders, options.productKey || 'all');
    var generatedAt = options.generatedAt || new Date().toLocaleString();
    var summaryRows = [
      ['Orders (all statuses)', model.totalOrders],
      ['Active orders', model.activeOrderCount],
      ['Order value (excludes cancelled, returned, refunded)', 'PHP ' + formatMoney(model.totalRevenue)],
      ['Average active order value', 'PHP ' + formatMoney(model.averageOrderValue)],
      ['Units sold (active orders)', model.itemsSold],
      ['Confirmed paid', 'PHP ' + formatMoney(model.confirmedPaid)],
      ['Payment not confirmed', 'PHP ' + formatMoney(model.notConfirmed)]
    ];
    var statusRows = model.statusRows.map(function(status) { return [status.status, status.orders]; });
    var productRows = model.productRows.map(function(product) {
      return [product.name, product.orders, product.units, 'PHP ' + formatMoney(product.value)];
    });
    var monthlyRows = model.monthlyRows.map(function(month) {
      return [month.month, 'PHP ' + formatMoney(month.confirmed), 'PHP ' + formatMoney(month.notConfirmed), month.orders];
    });
    var customerRows = model.topCustomers.map(function(customer) {
      return [customer.customer, customer.orders, 'PHP ' + formatMoney(customer.value), customer.share + '%'];
    });
    var detailRows = orders.map(function(order) {
      var itemText = (Array.isArray(order.items) ? order.items : []).map(function(item) {
        return (item.name || 'Item') + ' x' + itemQuantity(item);
      }).join('; ');
      return [order.number || order.orderNumber || order.docId || '', order.customer || order.email || '', order.date || '', order.status || 'Pending', 'PHP ' + formatMoney(order.total), itemText];
    });
    var productTitle = 'Sales by Product - ' + (options.selectedProduct || 'All products');
    var content = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SmileHub Sales Report</title>' +
      '<style>' +
      '@page{size:A4;margin:14mm;}*{box-sizing:border-box}body{font:10pt/1.4 Arial,Helvetica,sans-serif;color:#172b3a;margin:0}h1{font-size:22pt;margin:0 0 4pt;color:#075c67}h2{font-size:13pt;margin:18pt 0 6pt;color:#075c67;break-after:avoid}p{margin:3pt 0 12pt;color:#4b5d6c}table{width:100%;border-collapse:collapse;margin:0 0 12pt;font-size:8.5pt}thead{display:table-header-group}tr{break-inside:avoid}th,td{border-bottom:1px solid #cbd5dd;padding:5pt 6pt;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e7f1f2;color:#193746}section{break-inside:auto}.empty{color:#64748b}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>' +
      '</head><body><h1>SmileHub Sales Report</h1>' +
      '<p>' + escapeHtml(options.periodLabel || 'All Time') + ' | Trend: ' + escapeHtml(options.granularity || 'Automatic') +
      ' | Product filter applies to Sales by Product only<br>Generated ' + escapeHtml(generatedAt) + '</p>' +
      htmlTable('Summary', ['Metric', 'Value'], summaryRows) +
      htmlTable('Orders by Status', ['Status', 'Orders'], statusRows) +
      htmlTable('Payment by Month', ['Month', 'Confirmed paid', 'Payment not confirmed', 'Orders'], monthlyRows) +
      htmlTable(productTitle, ['Product', 'Orders', 'Units sold', 'Item value'], productRows) +
      htmlTable('Top Customers (active orders only)', ['Customer', 'Orders', 'Order value', 'Share'], customerRows) +
      htmlTable('Order Detail', ['Order #', 'Customer', 'Date', 'Status', 'Total', 'Items'], detailRows) +
      '</body></html>';
    return content;
  }

  root.SmileHubReportUtils = {
    buildModel: buildModel,
    buildCsv: buildCsv,
    buildPrintHtml: buildPrintHtml,
    formatMoney: formatMoney
  };
})(window);

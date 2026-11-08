// A buyer's records (#636): the library, orders and a receipt. Every read is protected and keyed by the buyer, so
// switching accounts never shows the last buyer's library, even for a moment. Downloads and installs (#635), refunds
// and the receipt's payment axes (#634) are their slices.
import * as React from 'react';
import { Badge, Breadcrumb, PageHeader, PageHeaderDescription, PageHeaderTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'altitude-design';
import { date, KIND_WORD, money, useProtected } from './client';
import { CATALOG, href } from './routes.ts';
import type { LibraryEntry, OrderView } from './store.ts';
import { Empty, NotFound, Protected, useTitle } from './states';

export function Library() {
  const query = useProtected<LibraryEntry[]>('library.list');
  useTitle('Your library');
  return (
    <Protected query={query} noun="your library">
      {(items) => (
        <main className="ds-page" id="main">
          <PageHeader><PageHeaderTitle tabIndex={-1}>Your library</PageHeaderTitle>
            <PageHeaderDescription>Everything you’ve bought or claimed, with the license you hold.</PageHeaderDescription>
          </PageHeader>
          {items.length === 0
            ? <Empty title="Your library is empty" description="What you buy or claim appears here." action={<a className="ds-link" href={href(CATALOG)}>Browse the catalog</a>} />
            : (
              <div className="ds-table">
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>License</TableHead><TableHead>Added</TableHead><TableHead>Availability</TableHead><TableHead>Order</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {items.map((g) => (
                      <TableRow key={g.grantId}>
                        <TableCell><a className="ds-link" href={href({ name: 'product', id: g.productId })}>{g.title}</a><div className="ds-meta">{KIND_WORD[g.kind]}</div></TableCell>
                        <TableCell>{g.license}</TableCell>
                        <TableCell>{date(g.grantedAt)}</TableCell>
                        <TableCell>{g.status === 'listed' ? 'Available' : <Badge tone="caution" variant="soft">No longer available to download</Badge>}</TableCell>
                        <TableCell><a className="ds-link" href={href({ name: 'order', id: g.orderId })}>{g.orderId}</a></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </main>
      )}
    </Protected>
  );
}

const PAYMENT_WORD = { paid: 'Paid', free: 'Free claim' } as const;

export function Orders() {
  const query = useProtected<OrderView[]>('orders.list');
  useTitle('Orders');
  return (
    <Protected query={query} noun="your orders">
      {(orders) => (
        <main className="ds-page" id="main">
          <PageHeader><PageHeaderTitle tabIndex={-1}>Orders</PageHeaderTitle>
            <PageHeaderDescription>Receipts for what you’ve bought and claimed.</PageHeaderDescription>
          </PageHeader>
          {orders.length === 0
            ? <Empty title="No orders yet" />
            : (
              <div className="ds-table">
                <Table>
                  <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Placed</TableHead><TableHead>Items</TableHead><TableHead align="end">Total</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell><a className="ds-link" href={href({ name: 'order', id: o.id })}>{o.id}</a></TableCell>
                        <TableCell>{date(o.placedAt)}</TableCell>
                        <TableCell>{o.lineDetails.map((l) => l.title).join(', ')}</TableCell>
                        <TableCell className="ds-num">{money(o.total, o.currency)}</TableCell>
                        <TableCell>{PAYMENT_WORD[o.payment]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </main>
      )}
    </Protected>
  );
}

/** A receipt: the order's lines, each with its version and license terms, and the total. Shared with support. */
export function Receipt({ order }: { order: OrderView }) {
  return (
    <>
      <dl className="ds-dl">
        <div><dt>Placed</dt><dd>{date(order.placedAt)}</dd></div>
        <div><dt>Payment</dt><dd>{PAYMENT_WORD[order.payment]}</dd></div>
        <div><dt>Total</dt><dd className="ds-strong">{money(order.total, order.currency)}</dd></div>
        {order.buyer && <div><dt>Buyer</dt><dd>{order.buyer.name} · {order.buyer.email}</dd></div>}
      </dl>
      <div className="ds-table">
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Version</TableHead><TableHead>License</TableHead><TableHead align="end">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {order.lineDetails.map((l, i) => (
              <TableRow key={i}>
                <TableCell><a className="ds-link" href={href({ name: 'product', id: order.lines[i].productId })}>{l.title}</a></TableCell>
                <TableCell>{l.semver}</TableCell>
                <TableCell>{l.license}, terms v{l.termsVersion}</TableCell>
                <TableCell className="ds-num">{money(l.amount, order.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function OrderPage({ id }: { id: string }) {
  const query = useProtected<OrderView>('order.get', { id });
  useTitle(`Order ${id}`);
  return (
    <Protected query={query} noun="the order" missing={<NotFound title={`There’s no order ${id} in your account`} detail="Check the number on your email receipt." back={{ label: 'Go to your orders', to: href({ name: 'orders' }) }} />}>
      {(order) => (
        <main className="ds-page ds-narrow" id="main">
          <PageHeader breadcrumb={<Breadcrumb fit="wrap" items={[{ label: 'Orders', href: href({ name: 'orders' }) }, { label: `Order ${order.id}` }]} />}>
            <PageHeaderTitle tabIndex={-1}>Order {order.id}</PageHeaderTitle>
          </PageHeader>
          <Receipt order={order} />
        </main>
      )}
    </Protected>
  );
}

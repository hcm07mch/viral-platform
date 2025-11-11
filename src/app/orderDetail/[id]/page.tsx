import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderDetailClient from './OrderDetailClient';

export default function OrderDetailPage() {
  return (
    <>
      <Header active="orders" pageTitle="주문 상세" />
      <OrderDetailClient />
      <Footer />
    </>
  );
}

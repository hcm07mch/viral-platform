import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderListClient from "./OrderListClient";

export default function Page() {
	return (
		<>
			<Header active="orders" pageTitle="주문 목록" />
			<OrderListClient />
			{/* <Footer /> */}
		</>
	);
}

interface BookingType {
   id: number;
   name: string;
   image: string;
   checkIn: string;
   checkOut: string;
   nights: number;
   status: string;
   totalPrice: number;
}
interface CreateBooking extends CustomerBooking {
   rooms: { roomId: string; roomNumber: number }[];
   totalPrice: number;
   checkInTime: string;
   checkOutTime: string;
   numberOfGuest?: number;
}

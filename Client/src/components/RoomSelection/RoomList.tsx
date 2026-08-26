import RoomSelection from './RoomSelection';

interface RoomsListProps {
   roomList: RoomOption[];
   onChange: (
      selectedRooms: { roomId: string; roomType: string; count: number }[],
   ) => void;
   value: { roomId: string; roomType: string; count: number }[];
   /** Upper bound on the total rooms across all types (one room per guest at most). */
   maxTotalRooms?: number;
}

const RoomsList: React.FC<RoomsListProps> = ({
   roomList,
   onChange,
   value,
   maxTotalRooms,
}) => {
   const totalSelected = value.reduce((acc, room) => acc + room.count, 0);
   const remaining =
      maxTotalRooms === undefined
         ? Infinity
         : Math.max(maxTotalRooms - totalSelected, 0);

   const handleRoomSelection = (selectedRoom: {
      roomId: string;
      roomType: string;
      count: number;
   }) => {
      const updatedSelectedRooms = value.filter(
         (room) => room.roomId !== selectedRoom.roomId,
      );
      if (selectedRoom.count > 0) {
         updatedSelectedRooms.push(selectedRoom);
      }
      onChange(updatedSelectedRooms);
   };

   return (
      <div className="space-y-4">
         {roomList.map((room) => (
            <RoomSelection
               key={room._id}
               roomOption={room}
               onChange={handleRoomSelection}
               selectedCount={
                  value.find((r) => r.roomId === room._id)?.count || 0
               }
               remainingRooms={remaining}
            />
         ))}
      </div>
   );
};

export default RoomsList;

import { WebSocket } from 'ws';

export interface ClientInfo {
    id: string;
    socket: WebSocket;
}

export class RoomManager {
    private rooms: Map<string, Map<string, ClientInfo>> = new Map();

    addClient(roomId: string, clientId: string, socket: WebSocket): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }

        const room = this.rooms.get(roomId)!;
        room.set(clientId, { id: clientId, socket });

        console.log(`[Room ${roomId}] Client ${clientId} joined. Total: ${room.size}`);
    }

    removeClient(roomId: string, clientId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.delete(clientId);
        console.log(`[Room ${roomId}] Client ${clientId} left. Total: ${room.size}`);

        if (room.size === 0) {
            this.rooms.delete(roomId);
            console.log(`[Room ${roomId}] Room is empty, deleted.`);
        }
    }

    getClientsInRoom(roomId: string): ClientInfo[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.values());
    }

    getClient(roomId: string, clientId: string): ClientInfo | undefined {
        return this.rooms.get(roomId)?.get(clientId);
    }

    findRoomByClient(clientId: string): string | undefined {
        for (const [roomId, clients] of this.rooms.entries()) {
            if (clients.has(clientId)) {
                return roomId;
            }
        }
        return undefined;
    }
}
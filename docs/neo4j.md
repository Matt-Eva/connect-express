# Neo4j Notes

## Nodes

We currently have 3 Node types
 1. Users
 2. Chats
 3. Messages

And 4 Relationship types

1. User - User: CONNECTED
2. User - Chat: PARTICIPATING_IN_CHAT
4. Message - Chat: SENT_IN_CHAT

## Indexes

Instead of making rank based on greater positive number, make it on lesser numbers (negative). 

Neo4j can use the ORDER BY with an index sort more effectively when sorting in ascending order, as that's how they're stored in the database
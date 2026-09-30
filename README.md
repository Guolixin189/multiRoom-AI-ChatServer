# CSE3300 Module 5

Lixin Guo 525626 Section 02 Guolixin189  
Nachuan Ding 605549 Section 02 dingn0823

This project is our Module 5 group portion: a multi-room chat server built with Node.js and Socket.IO.

## Deployment

Deployed on Render (free tier) — the Express server serves both the WebSocket backend and the static frontend from `chat/public`, so a single web service is enough:

- Root directory: `chat`
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `OPENROUTER_API_KEY` (enables the `/agent` AI feature)

Instructions:

- No password is needed for the lobby. Just enter a nickname to join.
- To test a private room, create a room with a password and then join it from another browser window.
- To test the AI feature, type `/agent` followed by a question in any room.

Notes:

- Render's free tier sleeps after ~15 minutes of inactivity, so the first request after idle may take ~30 seconds to respond.
- Rooms, users, and chat history are kept in memory and reset when the server restarts.

## AI Model Used

The `/agent` command calls the OpenRouter API (`meta-llama/llama-3.3-70b-instruct:free`, OpenAI-compatible chat completions endpoint).

Set `OPENROUTER_API_KEY` as an environment variable (or in a local `.env` file inside `chat/`) — without it, the `/agent` feature returns an error message, but the chat server itself keeps running.

## Main Features

- Users can enter a nickname in the lobby
- Users can create chat rooms with any room name
- Users can join available chat rooms
- Users in the current room are displayed on the right side
- Private password-protected rooms are supported
- Room creators can kick users out of the room
- Room creators can ban users from rejoining that room
- Messages show the sender’s username and are broadcast to everyone in the room
- Users can send private messages to another user in the same room
- Everything runs on a single webpage

## Creative Portion

1. **User Identity**

   A user status bar is shown at the top right of the page and displays the current nickname. Users can log out and return to the login screen to enter a different nickname and rejoin the lobby.

2. **Real-Time Typing Indicators**

   The chatroom shows a typing indicator when someone is currently typing. This also works for the AI Agent. If more than one person is typing at the same time, the interface shows a combined message instead of listing too many separate indicators.

3. **Per-Room Message History**

   Each room stores recent messages in memory. When a user joins a room, they can immediately see the recent conversation instead of entering an empty chat. Right now the server keeps the latest 20 messages for each room during the current server session.

## Notes for Testing

For the best test:

- open two browser windows
- join the same room with two different nicknames
- test normal chat, private messaging, kick/ban, and room switching
- test `/agent` in a room
- test a private room by creating a room with a password

## AI Reflection

### Before Coding

**What is the goal of this assignment?**  
The goal of this assignment is to build a multi-room chat application using Node.js and Socket.IO. We needed to support room creation, joining rooms, private messaging, room administration, and an AI assistant command.

**When will you use AI, and when will you avoid it?**  
We used AI mostly for planning logic, debugging, and understanding how to connect different parts of the real-time chat system. We tried not to rely on AI for everything, especially for the basic page structure and parts we could reasonably write and understand ourselves.

**What conceptual questions did you ask the AI?**  
We asked questions about how to manage users and rooms in memory, how to send private messages between users in the same room, and how to handle room-based state changes with Socket.IO. We also asked about typing indicators and about how to connect the `/agent` command to an AI model.

### During Development

**Paste your three most useful AI prompts.**

1. `How do I implement a private message feature where only two users in the same room can see the text?`

2. `My EC2 instance is running out of memory when trying to load a large language model. How can I set up a swap file?`

3. `How can I implement a typing indicator that shows when a user or the AI is generating text?`

**What was the AI’s response? (Summarize.)**  
The AI explained the general logic for private messaging with socket IDs, suggested Linux commands for setting up swap space on EC2, and described how a typing indicator could be implemented using events and a timeout so the message would disappear when typing stops.

**What did you change in the AI’s output, and why?**  
We changed some of the AI suggestions to better fit our project. For example, we used `tinyllama` with local Ollama instead of a larger model, because that was more realistic for our EC2 setup. We also adjusted the typing indicator display so it fit the look of our chat UI better.

**What worked and what did not? (Be specific.)**  
The general Socket.IO logic from AI suggestions was useful, especially for private messaging and typing events. Some AI suggestions were too generic and did not fully match our existing code structure, so we had to adapt them. We also found that model choice mattered a lot because of EC2 resource limits.

### After Completion

**What errors did the AI make that you caught?**  
One issue was that some suggested logic did not properly match our current room-handling code, so we had to rewrite parts of it to avoid breaking room joins. Another issue was that some suggestions did not fully consider edge cases like a user leaving the room before a private message is sent.

**What debugging or testing did you do?**  
We tested the project by opening multiple browser windows with different nicknames. We checked room creation, joining, private rooms, private messaging, kick/ban behavior, typing indicators, and the `/agent` command. We also tested recent room message history after users joined a room later.

**What did you understand better because of the AI?**  
AI helped us understand room-based state management, private message flow, and how to handle asynchronous AI responses in a chatroom. It also helped clarify some EC2 setup issues related to running a local model.

**What would you change about how you use AI next time?**  
Next time, we would verify environment constraints earlier before trying bigger AI-related setups. We would also spend a little more time checking how well AI suggestions match our existing code before copying any ideas into the project.
<br><br><br><br><br><br><br><br><br>
Rubric

| Possible | Requirement                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| 5        | Users can create chat rooms with an arbitrary room name                         |
| 5        | Users can join an arbitrary room                                                |
| 5        | Chatroom displays a list of users in the room                                   |
| 5        | Private, password protected rooms can be created                                |
| 3        | Creators of room can temporarily kick users from the room                       |
| 2        | Creators of room can permanently ban users from the room                        |
| 1        | A user's message shows their username and is sent to everyone in the room       |
| 4        | Users can send private messages to other users in the room                      |
| 2        | Code is well-formated and easy to read                                          |
| 2        | Site passes the [HTML5 validator](https://validator.w3.org/)                    |
| 0.5      | `package.json` is included, with all dependencies needed to run the application |
| 0.5      | `node_modules` is ignored by git using a `.gitignore` file                      |
| 4        | Communicating with others and joining rooms is easy and intuitive               |
| 1        | Site is visually appealing                                                      |
| 10       | Implement an AI assistant via the command \agent                                |
| 5        | Handles errors gracefully when communicating with the agent                     |
| 5        | Completion of the AI Reflections                                                |

## Creative Portion (10 possible)

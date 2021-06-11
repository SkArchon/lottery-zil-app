# Lottery Application
![screenshot](https://user-images.githubusercontent.com/83293842/121702103-34659880-caef-11eb-9256-8e9d347799a1.png)

# Overview

This is a submission for the gitcoin bounty https://gitcoin.co/issue/Zilliqa/Zilliqa/2547/100025674

The application uses a monorepo architecture where
* backend-listener-service
  This service acts as a caching layer for the application, it processes all events from the contract (Such as Mint, AllocateWinnings, etc), and populates a separate mongodb database. It also contains a scheduler that runs and processes draws when the time has elapsed.

* contracts
  Contains all of the code for the contracts, had problems deploying via js. So to deploy it use the scilla IDE at https://ide.zilliqa.com/

* user-interface
  A frontend application written in Angular that contains the frontend for our app. We use zilpay as our wallet.

# Functionality 

### Getting Into the Application

We use zilpay as our wallet. If the user tries to do any write actions (like buy a ticket) he/she would be prompted to login.

After the user logs in, we use the account Id to get additional information. Namely the tickets the user has purchased previously (if present). All of this data is stored in a redux style store (ngrx in angular). Which allows for high synchronity.

The draw tracker is set to countdown until the timer is hit.

### Purchasing a ticket - purchase

As long as a draw countdown timer has not expired (and will block users from purchasing until the timer is reset by the draw being processed by our scheduler). The user can do a purchae. A user edits the textbox until a valid amount shows up. For which the user will then be prompted via the zilpay wallet to confirm the transaction. The ticket that is purchased is an NFT that is minted.

### Running the draw
The contract is made currently so that anyone can call the contract to initate the draw, so in case the administrator has gone missing and the service is in limbo. Anyone can initiate. (However validations on time should be added, check known issues).

Another thing is that we use our backend service to actually generate a random number, this requires users to trust our centralized service. In an ideal solution we should use Chainlik VRF or anything similar. (A tamper proof mechanism).

The service that calls the draw is also centralised, even though this is not as big of a problem as a random numbers. We could use something like ChainLink Alarm Clock, to handle this as well when ChainLink is implemented fully with the Zilliqa blockchain.

**Picking The Winner**

The winner is picked by finding the participant amount (by substracting latestToken - startToken) since the token Ids are incremental. We apply our random number to find the winner.

### Claiming and Transferring
Since the ticket is an NFT and the winning amount is mapped to the NFT token Id users can claim the amount locked in the NFT to their wallet, or even transfer the NFT to anyone as well. NFTs can be trasnferred before and after the draw, so you could offer to buy up a ticket for a friend before the draw, or even gift him after your tickets wins you the lottery. 

To transfer we use the standard NFT transfer API, and a custom extension method on the NFT to claim the reward.
### Known Issues
- We currently do not check the timestamp or blockNumber or such, so the user can actually purchase at any time while the draw is happening. Ideally there should be a restriction (with a bit of leeway) since purchase transactions can be initiated a second before the timer goes off but takes time to be processed.

- Using centralized service to generate random number, to use Chainlink VRF when available

- There is no initial synchronization of the backend service. Lets say the service was down for a couple of hours and users had purchased tickets, and other actions happened. These will be ignored, as the starting point is whenever the server starts up. To write a synchronize method to sync any events that were missed would be required.

- Completing Transactions On The Frontend - When a transaction is completed on the frontend the UI is updated only when the backend service listneer gets the appropriate event and updates the mongodb database. Currently we simply add a delay after the transaction has been completed by zilpay and query the backend listener service. HOWEVER the reality is that this is all asynchronous and the event can be processed 5 mins later as opposed to near instantly. So to handle this we need to apply a technique similar to listen for the event being read by the backend listener and then only update the UI. Or if we dont want to display a loader for a long time, simply exit the loader and track it separately and inform the user on the confirmation. (Perhaps have something like a sync status dialog).

- Draws can overlap, where multiple draws have elapsed. What I mean is, lets say a draw last 5 minutes, however draw #1 which was supposed to be processed at 5 PM was not processed yet. When the seheduler is started back up at 6 PM the next draw time will be 5:05 PM which is still in the past. This is less unlikely when the draw is processed lets say once every two days, but still possible. Logic needs to be added to set the time to the most recent draw in the future.

- Mobile viewports breaks the UI a bit (especially on the home page), currently approximately tab displays and larger would display correctly.

- There is a mix of BEM css and non BEM css along with css classes duplicated and spread between files, these need to be refactored.

- As mentioned previously, probably allow user to continue using the app without waiting for transaction confirmations, by changing the overall design.

- Add setters to update the field variables like ticket price, and draw interval.

- Automatically set the Minter privilege for the Lottery contract (on deployment ideally, or in a more secure fashion essentially.

- Switching accounts on Zilpay is currently not supported. To change accounts on the application, make sure to logout and then switch and login.

- There are no pagination for draws from the client size, however this has been setup from the backend side. Infinite scrolling should be implemented on the draws page.

- Remote fetches to be used. When writing the smart contract we attempte to use remote fetches, but due to the Scilla IDEs limitations, local deployment scripts not working as expected and due to lack of time. We opted to simply duplicate some state between the Lottery and LotteryTicket contract. Namely the last token Id. In a correct production system, a remote fetch should be used to figure out the last token id purchased for processing and finding the winner of the draw.

# Architecture

![screenshot](https://user-images.githubusercontent.com/83293842/121707320-10588600-caf4-11eb-944c-479c07d85637.png)

### Web App (Client)
This is the client web app which users will be interacting with to buy tickets as NFTs to participate in the lottery. The frontend is built using Angular. It uses Ngrx as its data source for displaying data. This store is an important component because it allows us to transparently update the UI by simply updating the store without us needing to worry about components. We can listen to events from the blockchain through our backend listener and update the frontend transparently. While there are no websockets or event listeners right now, this would not be a big change. Currently this is mocked via delays and setIntervals to simulate this behavior, however substituting them for actual events should not take much effort due to the current design. While all read data comes from the API (in the backend) all transactions go to the blockchain directly, this is done by using the ZilPay wallet to sign transactions.

### Backend Listener
The backend listener has two functions, the primary being that it works as an intermediate layer between the blockchain and the web app (client). This will make sure that the app scales to the future (as at some point we cant simply rely on get state as that will leage to huge payloads). And also fits in nicely by using an event driven approach.
For example, the user will buy tickets directly by writing to the blockchain via a transaction (using the smart contract), this would caues the blockchain to emit an event that the "purchase" action was successful. The backend listener processes this and adds a new ticket entry to mongodb, which would be returned to the client when requested.
As discussed before, the next step is making sure the connecton between the client and the backend listener is event driven as well.

The other functionality of the backend listener is to trigger draws by writing directly to the blockchain (via the smart contract). This is done by a scheduler. The application also provides the random seed to the smart contract to determine the winner.

### MongoDB
This database holds data that is processed via the backend listener. Currently it holds two types of data primarily.
1. Tickets - This holds the tickets and which user owns it, as well as any amount that has been won by a ticket.
2. Draws - This holds the draws, both past and current.

# Project Setup

### Method using helper scripts

Run the following from the root directory, if you look at the root directory package.json it has a setup of helper scripts.
```
npm run install-all
```

I have attached a private key of a throwaway test account. From here on I will use the following address for setup instructions, but if you want you can use your own address or private key as well.

```
Address : 0x227Ec3B4F3C97267aF73A8e648fE5067f5283C5E
Private Key : e7bc233b0994d188379d7c4c9053375938a8a7a32d4c0c284da9820d34f298e8
```

Then copy the two contracts in the contracts folder and deploy them using the Scilla IDE. Deploy the `LotteryTicket.scilla` contract first, Use any params you like, but make sure you set the contract owner to the above address. (Some example params)

```
contract_owner = '0x227Ec3B4F3C97267aF73A8e648fE5067f5283C5E'
name = 'Lottery Token'
symbol = 'LOT'
```

And make a note of its deployed address. 

Then do a search for "<<REPLACE_ME>>" in the `Lottery.scilla` contract, replace the timestamp with a future timestamp. probably 10 mins into the future. You can use https://www.epochconverter.com/ to calculate the timestap. The field looks like

```
field draw_timestamp: Uint64 = Uint64 1623412598
```

Then deploy the `Lottery.scilla` contract, and you could use lets say the followign params as an example

```
owner = '0x227Ec3B4F3C97267aF73A8e648fE5067f5283C5E'
ticket_address = '<<address_from_previous_deployment>>'
max_ticket_count_per_purchase = 100 // This value is hardcoded to 100 from the frontend, so ideally should be 100 here as well BUT if you want to test a contract failure via validation put in a different number like 68 and try to purchase more than 68 tickets at once then.
```

Then make a note of the deployed address.

You should have the following now
```
1. LotteryTicketAddress = <<someLotteryTicketAddress>>`
2. Lottery = <<someLotteryAddress>>`
```

Then search for "<<REPLACE_ME>>" globally in the project repository. You should be shown the following files app.constants.ts (two files, one for backend listener service and user interface), this is ignoring the previously mentioned `Lottery.scilla` file.

Make sure to replace the appropriate contract address in the correct place.

```
CONTRACT_ADDRESS <- replace with Lottery.scilla address
LOTTERY_TICKET_CONTRACT_ADDRESS <- replace with LotteryTicket.scilla address
```

After you are done with that, one last step is to make sure that mongodb is installed, and create a database named `scilla` (or whatever you like), once that is done make sure that in the backend-listener-service app.constants.ts the `MONGODB_URL` constant URL is correct.

To run the application start the followwing services

For backend ->
```
cd backend-listener-service
npm run start
```

For client ->
```
cd user-interface
npm run start
```

Note that you have the option of running `npm run start-services` from the root. This will startup both the client and server in a single terminal (concurrently). However the logs can get convoluted, so its best to run them separately.

The backend listener service will probably take a few minutes to startup at the first time. It does the following (refer `startup.service.ts` as well).

1. Check if a default draw entry is present (the first draw wont have a draw entry since no event was emitted for it, so we need to create one if we havent done already)

2. We use the timestamp from the contract state to make sure we get and set the correct draw timetsamp. Again this is as we dont have an event for the first draw.

3. The longest part of the step is configuring minters, if you would like (or if this fails for some reason, pleaes comment out the code and run ConfigureMinter manually). We automatically used the contract address that you replaced to set the Lottery contract as a minter for the LotteryTicket contract. We also use the IsMinter role to also allocate the winnings, but this can be changed to a different role / entirely new role if needed.


Couple of potential issues
I have noticed a couple of times that the server unfortnuately does not start properly. The server gets stuck on the log message
```
console.log("Listening Initiated");
```

And is unable to setup the event listeners, however a restart or two usually fixes this. Was unable to fix this / look into this due to the time contraints.


After the server has started -> That is make sure the log message `Started Listening` was displayed on the logs. Then navigate to http://localhost:4200, if everything was deployed correctly, you should get the page in the above screenshot (or similar) without tickets.

**Resetting**

If there is a need to reset to a clean state, our recommendation is currently to
1. Have any running services stopped
2. Deploy a new contract for both the Lottery and LotteryToken.
3. Clear out the mongodb database used, drop it and recreate it ideally
4. Update contract details
5. Restart services

The reason for resetting the contracts and mongodb is as there is duplicated state in the Lottery.scilla contract (the last purchased token Id) and on top of that there is no mechanism at the moment to synchronize data from the start when the backend service is not running. Therefore it is best to reset everything and start from a clean slate then. 







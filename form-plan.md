# Grand Plan

## Overview

Ok so what I want is a spruced up online form webpage that uses AI to help guide the user.

## Background

Ok, so the larger idea is to create a sort of encyclopedia for ultimate Frisbee drills and strategies. 
I play the sport at a high level, and I will be in a leadership role for my next season. I have never
coached before, and because its a small sport there are not too many ultimate specific online resources.
I know that there must be tons of other people out there that are having a similar issue,
especially at lower levels with new teams, or like hs teams and the like. I want people to have 
access to an encyclopedia of ultimate Frisbee knowledge availible to them. As such, I am
preparing to start gathering data and knowledge to help start the knowledgebase. 

## Specifics for this task

I want to make an interactive online form that I can give to coaches and players and have 
impart some knowledge, whether thats a preferred drill, exercise, or strategy. I have a 
tournament this weekend and I hope to be able to talk with a bunch of coaches and give them 
this form. What I want for the form is to have it be a simple, low friction, and understandable 
pathway to extract as much knowledge as painlessly as possible from people who are generously
giving their time and experience to help my app. This form also reflects upon me as well, and so
I want it to look nice and feel nice to use. 

## Design Guidelines

A key thing that I am going for is ease of use. The user should be able to quickly and 
easily understand how it all works.

I want there to be plenty of tutorial info for the user. I imagine that they would begin on
a 'tutorial' screen that explains the purpose of the site, how to use it, etc, and they can 
click begin from there. There should also be info tooltips availible for each section of the form
(and really most things).

The site should also be easily navigatable. In theory its all one screen, and they can 
scroll/ click dropdowns to see previous stuff. I dont want the user to get stuck somewhere and not
be able to find what they need. When they are done with the form, there should be a submit button
that makes them confirm before submitting. Submitting an item should take them back to the start
of the process so that they can submit another item. (or even better it can take them to a screen
thanking them for their help and giving them an option to submit another item)


## Page/Form content

Ok, so I imagine that there would probably be 3 different options for info at the start of the 
process: Drills, Strategies, Other. The user can click on whichever one of the three they want 
to provide info for.

### Drills

This includes things like individual drills, team drills, workout drills, agility drills, 
throwing drills, scrimaging drills, etc. The info I would want to gather for each drill 
would be something along the lines of:
- Drill name
- Drill overview (1-2 sentence summary (if possible))
- Drill concepts (what the drill focuses on/practices) (important, this is where I get the info
to assign tags for each drill, ie Agility, Throwing, Marking, Warmups (stuff to sort the drill by category))
- Drill setup (how to set up the drill)
- Drill walkthrough (how the drill is run)
- Drill focuses (specific advice from coach about things to focus on, things to encourage in drill,
things to look out for, goals for successfull drill)

### Strategies

Strategies can be formations (Ho/Vert/Hex/Zone/etc), cutting patterns, play designs, 
and other smaller tips. This can probably be a seperate place with more options for the 
user to select their path, with buttons for the above things (formations, play designs, other).

For the formations stuff, these are mostly pretty well documented, and so im looking more for 
tips and wisdom rather than tutorials for how to run the formation.
I probably want to hear about:
- Formation name
- What should teams think about/focus on/consider when running this
- Where do teams go wrong most often when running this
- Situations where this formation is best in
- Other wisdom regarding formation

For play designs, this one is more unique to coaches. I probably want to hear about:
- Play name
- Formation to run play out of
- How do you set up the play
- How do you run the play (explanation of where people go, where throw goes, etc)
- What are goals of this play (what does it accomplish ideally)
- What are things to be carefull of when running the play
- Other info 

For other stuff, thats moreso sub-concepts like switches, marking, handler movement, 
and more continuous parts of the game. I want to hear from coaches about:

- Name of concept
- What do you want people to know about this concept?

### Other 

Honestly dont know what goes here, but i want to give the coaches freedom to give me as 
much info as possible I can sort through the info later. For this, I can just have a section like
- What would you like for people to know about this concept?

## Page layout

I want the user to land on a tutorial page that explains the page concept and how it works. 
This should not be super long. There should be a clear button to go to the form, and also a clear
option to learn more. The learn more option will take the user to a more comprehensive 
documentation for both the form and also more about my plans for the app. Clicking the button 
to go to the form should slide the tutorial section up and it should shrink to an expandable dropdown
option bar at the top of the page that the user can click to easily return to that info section.
On the page for the form should be the three buttons I mention above. Clicking one should slide 
the user down and show them their requested section (for strategies this is the second 
button section). The user should be able to scroll up to see all previous sections, but future 
sections are not there/reachable until they complete their current section. The user should be able
click to a different one of the buttons (drills stratagies etc) and it can switch to that section
(replacing all form content with the new section). If there is any user writing in the forms however
it should give a clear warning that they will lose their work if they switch away. 

## UX goal

I am going for a smooth and comfortable feel here. I want all animations to be smooth (and I want most
things to be animated). I want the colors to be warm and vibrant, but not too bold. I will probably
have each section be a sightly different contrasting color so that there is a clear boundry. 

## Next Steps:
Pending time, the next step of this is to incorporate AI into the design, where I have it work 
sort of like a chat with the AI, and the AI probes the user with guiding questions to achieve the
wanted info. I like this plan and want to be able to get to it, but its probably best as a next 
step rather than an MVP component. Plan however with this expansion in mind. 

# Plan v2

## Overview
After reflecting on the first version of the plan I want to make some changes. 
I think that we can ignore the deadline because I think that instead of giving the the coaches the form
directly, ill just inform them about the project and get their contact info so that I can send thme the form at
a later date. This will allow me to have a better, more polished setup for them.

## Key Features

### Interactive interview style process
I want the form to read a little more like an interview rather than a form. My goal is to extract as much valuable 
information as possible. I think that asking standardized questions that coaches have to format their answers
to fit would be less constructive vs giving the coaches a more free-form guided interview where they can
give info to their hearts content. Right now im only concerned with gathering information, and I plan on having
different agents assemble and curate all the information into usable bits later. Right now I just want to get as
much info as possible. 

An idea I had to make the form flow easier would be to have the first few questions be mostly curated and pre-selected
and then later have the questions be generated by an AI based on the previous answers. 
---
Maybe something like:

- Option: Drills / Strategies / Other
- User: Drills
- Question: Name of drill
- User: 4 lines
- Question: Type of drill?
- User: Team warmup, works on cuts and throws and gets the heartrate up
- Question: How would you setup the drill?
- User: Start by setting up 4 lines across the field with about 8 yards between outside and inside cones (inside lines 
can be close together or far apart). Use cones to cap the lines. Handlers start on outside lines, cutting lines
are the middle lines. Handler has a mark. The two throwing lines at either side of the field have the opposite 
throwing side/mark (ie drill is mirrored across the middle)
- Question: Briefly describe how to run the drill
- User: Start with upline cuts. Cutter cuts upline for thrower. After a few rounds move to under cuts (move cutting 
lines deeper down field). Switch up the force after a few rounds and force middle. Lastly move the cutting
lines back and do deep throws.
- {Here the AI will take the info and then ask a question like}
- Question: Warmup drills warmup the team both physically and also mentally. What should players be focusing on 
during this drill?
- {And the coach might answer like}
- Answer: It important for the team to remember to set up their cuts from the cutting lines, 
like jab under before cutting upline. Same thing for handlers, move the mark with fakes.

... 

- {Interview might go on, asking about different variations of the drill, specifics on marking strategies, or more 
detail on how specifically the drill operates}

---
I would probably have preset pathways and guidances for any of the paths that the user could go down 
regarding drills/strategies. Another thing that I would want to include would be a "early stopping mechanism" for 
if the system recognises early on that this drill is already well cataloged, it might tell the coach to skip
the explanations of how to run the drill, and focus more on detailed techniques and strategies. 

I probably will have a section in the database for each of the submitted drills/strategies covering what I know 
and dont know about the drills. For a popular drill like 4 lines, we will probably hear about all the basics 
very quickly, and that will be cataloged. Later when coaches try to talk about 4 lines, the program will 
recognise the drill, confirm with the coach that it is the same drill, and then probe the coach for detailed specifics
about techniques and stuff rather than redundant items already covered. When a drill becomes overly covered, or is very
simple, the program should probably just tell the coach that this drill already is well documented, and ask if theres
a different item they want to talk about. (4 lines is a drill that like every single team does, so will probably
be over-discussed very soon. I dont want 50 entries about 4 lines)

Anyways, I want it to transition from a form into an interview to get the most valuable information.

### Voice dictation support / other media

Its a lot easier to ramble into a microphone rather than type things out. I want to give the coaches the 
option to just speak their thoughts rather than type it all out. Voice dictation is a solved problem in 2026
so this should be very simple. Even better would be if I could program a voice interview mode where I have the 
app ask questions and stuff vocally as well (like an AI conversation but hopefully less soulless).

I also want users to be able to upload media like play diagrams or links to videos or etc if they want. I dont know
exactly how ill handle it in the future or if ill even use it, but its good to have in case coaches want to share
that stuff.

## Stretch features

### Existing encyclopedia starting point

As referenced above, I want to ideally have some sort of prior knowledge starting point for this. Theres tons of 
basic knowledge availible on the internet like skills, strategies, terminology, drills, etc. I want to pull all that 
info into my database early on, and be able to use that to augment and improve my responses from coaches. Like i mentioned
above in the 4 lines scenario, I dont want to waste my or the coaches time on a thing thats already been covered to death.
likewise, if the coach is talking about a complex topic, it would be good for the program to be able to reference 
background material to be able to ask appropriate questions, or guide the user in a more informative direction.

My eventual goal once I have the encyclopedia up and running is to still have the ability for people to 
make info submissions (and in fact thats a core use case). When a user makes a submission, I would absolutely
incorporate the existing knowledgebase into how I ask the questions and what I ask. I want to be able to do 
something similar here with having a baseline level of knowledge.
# Lead tracker: Supabase setup

This connects the lead tracker (`leads/`) to a free Supabase database so everyone on the team sees the same live list. It takes about 15 minutes, and you only do it once. You don't need to write any code.

Supabase changes its screens from time to time. If a button has moved, look for the same words nearby.

---

## Step 1: Create a Supabase account and project

1. Go to **https://supabase.com** and click **Start your project**. Sign up with GitHub (easiest, since the site is already on GitHub) or with your email.
2. Click **New project**.
3. Fill in:
   - **Organization:** your personal one is fine.
   - **Project name:** `dreamland-leads`
   - **Database password:** click **Generate a password**, then save it in your password manager. The app never uses it, but Supabase may ask for it later.
   - **Region:** pick the one closest to South Africa. Use a Cape Town / Africa region if one is listed. Otherwise pick a Europe region such as London or Frankfurt.
   - **Plan:** Free.
4. Click **Create new project** and wait a minute or two while it sets up.

> **Free plan note:** Supabase pauses a free project after about a week with no activity. Daily calling keeps it awake. If it ever pauses, log in to supabase.com and click **Restore project**. Your data is kept.

## Step 2: Create the leads table and security rules

1. In the left sidebar, click **SQL Editor**.
2. Click **New query** (or the **+**).
3. Open the file `leads/supabase-setup.sql` from this folder, copy **everything** in it, and paste it into the editor.
4. Click **Run** (bottom right), or press Ctrl+Enter.
5. You should see **"Success. No rows returned."** That's correct.

To check it worked: click **Table Editor** in the sidebar. You should see a table called **leads** with columns such as `business_name`, `phone`, `status` and so on.

**What the security rules do:** the leads table is locked. Only people who are **logged in** can see, add or change leads. Anyone else who finds the page or your keys gets nothing back.

There's one exception: the enquiry form on your public website. It can **add** a lead and nothing else. It can't read, change or delete anything. Every lead it adds is automatically an "Interested" lead marked "Website form", and very long entries are refused.

## Step 3: Stop strangers from creating their own login

This step matters. Without it, someone could sign themselves up and then see your leads.

1. In the sidebar, click **Authentication**.
2. Under **Configuration**, click **Sign In / Providers**. On some versions this is called **Providers** or **Settings**.
3. Turn **off** **"Allow new users to sign up"**.
4. Leave **Email** turned **on** as a provider, because that's how you and the caller log in.
5. Click **Save**.

## Step 4: Create the logins for you and your caller

1. Still in **Authentication**, click **Users**.
2. Click **Add user**, then **Create new user**.
3. Enter the person's email and a password. Tick **Auto Confirm User** so they don't have to click an email link first.
4. Click **Create user**.
5. Repeat for each person who needs access, such as yourself and the caller.

Give the caller their email and password privately, for example in person or by phone. Don't send them in the same message as the app link.

**To change someone's password or remove someone later:** go to **Authentication → Users**. Click the **⋯** next to their name, then reset the password or delete the user.

## Step 5: Connect the app to your project

1. In the sidebar, click **Project Settings** (the cog at the bottom).
2. Click **Data API** (or **API**), and copy the **Project URL**. It looks like `https://abcdefghijkl.supabase.co`.
3. Click **API Keys** and copy the **Publishable key**. It starts with `sb_publishable_`. On older projects it's the **anon public** key, a long string starting with `eyJ`.
   - **Don't** copy the **secret** key (or the **service_role** key). That one bypasses all the security rules and must never go on the website.
4. Open `leads/config.js` in this folder and replace the two placeholder values. Both the lead tracker and the enquiry form on your Contact page read them from this file.

   ```js
   window.DREAMLAND_CONFIG = {
     supabaseUrl: 'https://abcdefghijkl.supabase.co',
     supabaseKey: 'sb_publishable_xxxxxxxxxxxxxxxx'
   };
   ```

   Keep the quote marks. Save the file.

**Is it safe to put that key on GitHub?** Yes. The publishable key is designed to be public, a bit like the address of a building. The security rules from Step 2 are the locked door. Without a valid login, the key can't read any leads.

## Step 6: Publish and log in

1. Push the changes to GitHub. Your site will update within a minute or two.
2. Open **https://adriaan7711.github.io/dreamland-co/leads/** (or `yourdomain.co.za/leads/` once your own domain is connected).
3. Log in with one of the users from Step 4.
4. Click **Import** to upload your scraped list.

**Tip for the caller's phone:** open the link in Chrome (Android) or Safari (iPhone) and choose **Add to Home screen**. The app then opens like a normal app. The caller stays logged in until they tap **Log out**.

---

## Importing your scraped list

- Use an **Excel file** (.xlsx) or a **CSV** file. The first row must hold the column names. If the Excel file has several sheets, the app picks the one with the most rows, and you can switch to another sheet.
- After you choose the file, the app guesses which column is which. Check each one, and set any it missed. Only **Business name** is required.
- **Google Maps link** and **Address** columns are imported too. Each lead then gets a **Map** button that opens the business in Google Maps (on a phone, in the Maps app). Leads without a link get a Map button that searches by name and address or town.
- **Other emails** are added to the lead's email field. The Email button writes to the first address.
- Types are matched to Guesthouse, Hotel, B&B or Lodge. Anything else, such as Google's general "Lodging", "Self-catering" or "House", is left blank, or set to what you pick under **"Type for rows where it's blank or unclear"**.
- The app then shows how many rows are new and how many it will skip:
  - **Already in your list:** the same phone number, email or Google Maps place as an existing lead. `082 123 4567` and `+27 82 123 4567` count as the same number, and email capitals don't matter.
  - **Repeated within the file:** the same phone, email or place appears twice in the file. Only the first one is kept.
  - **Missing a business name:** the row is skipped.
- Province abbreviations such as `KZN`, `WC` and `GP` are expanded to the full province name automatically.
- You can safely import the same file again later. Anything already imported is skipped.

### One-off database update (October 2026)

The Address and Google Maps link fields were added after you first set up Supabase. Before your first Excel import, open **SQL Editor** in Supabase, paste the whole of `leads/supabase-setup.sql` again, and click **Run**. It's safe to repeat, and it doesn't touch existing leads. If you skip this step, the import stops with a message telling you to do it.

## The website enquiry form

Your Contact page has a form called "Guesthouse, B&B, lodge or hotel?" (`contact.html#trade`). The **Send a business enquiry** button in the bulk-orders section of the Products page links to it.

When someone sends it:

1. It appears in the lead tracker straight away, under **Warm leads**, with the status **Interested** and a "Website form" tag. Their message is saved in the lead's notes, starting with "Website enquiry:".
2. It's also emailed to you through Web3Forms, using the same key as the call-back form. So you get an alert, and the enquiry isn't lost even if Supabase is paused.

The visitor sees "Thank you" if either of those two worked. If both fail, they're offered WhatsApp instead.

**To test it:** once Steps 1–6 are done, fill in the form on your live site with your own details. It should show up under Warm leads within a few seconds. You can then delete the test lead in Supabase (**Table Editor → leads**, tick the row, **Delete**).

## The caller's email signature

Open **https://adriaan7711.github.io/dreamland-co/leads/signature.html** on a laptop. There's also a **Signature** link at the top of the lead tracker.

1. Fill in the caller's name, job title, phone, email address and website.
2. Click **Copy signature**.
3. Follow the steps on that page for **Gmail / Google Workspace** or **Zoho Mail**.

Until your domain is registered, the email and website boxes show `YOUR-DOMAIN.co.za` as a placeholder. Once you have the domain, open the page again, fill in the real address, and copy and paste the signature again.

The logo is the file `images/email-logo.png` on your website. Keep that file, or the logo will disappear from emails people have already received.

## If something goes wrong

| What you see | What to do |
|---|---|
| "Almost there… isn't connected to its database yet" | `config.js` still has the placeholder values. Redo Step 5. |
| "That email and password don't match" | Check the user exists in **Authentication → Users**, or reset their password there. |
| "Could not load leads: … permission denied" | The SQL from Step 2 didn't fully run. Run it again. It's safe to repeat. |
| "Email not confirmed" | In **Authentication → Users**, open the user and confirm them, or delete and re-add them with **Auto Confirm User** ticked. |
| Website enquiries arrive by email but not in the tracker | Check `leads/config.js` has your real values (Step 5), and that the SQL from Step 2 ran. Run it again if you're not sure. |
| The page says the project is paused | Log in to supabase.com and click **Restore project**. |

db.profiles.insertOne({
  _id: ObjectId("6a107ece86657cc5f284f9e7"),
  email: "usamakhalid.uk14@gmail.com",
  name: "fake",
  gender: "male",
  age: 28,
  dob: new Date("1996-01-15"),
  city: "Lahore",
  education: "Masters",
  profession: "Engineer",
  income: "75000-100000",
  caste: "Kashmiri",
  height: "5'10",
  houseStatus: "own",
  houseArea: "1200",
  bio: "Test profile for matching",
  photo: "https://i.pravatar.cc/150?img=1",
  profileStatus: "approved",
  profileCompletion: 100,
  paymentStatus: "completed",
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Profile inserted successfully!");

const Client = require('../models/clientSchema');
const Job = require('../models/jobSchema');
const Milestone = require('../models/mileStone.js');
const Gig = require('../models/gigSchema');
const bcrypt = require('bcrypt');
const { generateToken, validateClient } = require('../utils/authUtils');
const SubscriptionPlan = require('../models/subscriptionPlanSchema');

const createClient = async (req, res) => {
    try {
        const { name, email, password, companyName, industry, contactInfo } = req.body;
        
        if (!companyName || !industry || !contactInfo) {
            return res.status(400).json({ error: 'Company name,industry and contact-info are required' });
        }

        const existingClient = await Client.findOne({ email });
        if (existingClient) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const hashedpassword = await bcrypt.hash(password,10);
        req.body.password=hashedpassword;
        
        const client = new Client({
            ...req.body,
            role: 'client'
        });

        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const clientLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await validateClient(email, password);
        if (client) {
            const token = await generateToken(client._id);
            console.log("token",token);
            res.status(200).json({ token });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find({ role: 'client' });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllClientsByID = async (req, res) => {
    try {
        const client = await Client.findOne({ 
            _id: req.params.id,
            role: 'client'
        });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateProfileClient = async (req, res) => {
    try {
        const updatedClient = await Client.findOneAndUpdate(
            { _id: req.params.id, role: 'client' },
            req.body,
            { new: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(updatedClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteProfileClient = async (req, res) => {
    try {
        const deletedClient = await Client.findOneAndDelete({
            _id: req.params.id,
            role: 'client'
        });
        if (!deletedClient) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createJob = async (req, res) => {
    try {
      const { title, description, budget, milestones } = req.body;
      const clientId = req.user._id; // Assuming authenticated client
  
      // Create the job
      const job = await Job.create({
        title,
        description,
        budget,
        client: clientId
      });
  
      // Create milestones if provided
      if (milestones && milestones.length > 0) {
        const milestonePromises = milestones.map(milestone => {
          return Milestone.create({
            jobId: job._id,
            title: milestone.title,
            description: milestone.description,
            amount: milestone.amount,
            dueDate: milestone.dueDate,
            createdBy: clientId
          });
        });
  
        await Promise.all(milestonePromises);
      }
  
      res.status(201).json({
        success: true,
        data: job
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find();
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateJob = async (req, res) => {
    try {
        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedJob) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(updatedJob);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteJob = async (req, res) => {
    try {
        const deletedJob = await Job.findByIdAndDelete(req.params.id);
        if (!deletedJob) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getGigsByJob = async (req, res) => {
    try {
        const { jobID } = req.params;
        const { freelancerID } = req.query;

        // Get all gigs for the job
        const gigs = await Gig.find({ jobID });

        // // If freelancerID is provided, update the job
        // if (freelancerID) {
        //     await Job.findByIdAndUpdate(jobID, {
        //         $push: { freelancers: freelancerID }
        //     });
        // }

        res.status(200).json(gigs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const finaliseFreelancer = async (req, res) => {
    try {
        const { jobID, freelancerID } = req.params;
        // console.log("finaliseFreelancer funtion --->>> jobID:"+jobID+"freelancerID"+freelancerID);

        // Get all gigs for the job
        const gigs = await Gig.find({
            $and: [{ jobID }, { userID:freelancerID }]
          });
          
        // If freelancerID is provided, update the job
        if (freelancerID) {
            await Job.findByIdAndUpdate(jobID, {
                $push: { freelancers: freelancerID }
            });
        }

        res.status(200).json(gigs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


const getSubscriptionPlansForClients = async(req,res)=>{
    try {
        const subscriptionPlans = await SubscriptionPlan.find({for:"client"});
        return res.json(subscriptionPlans);
    } catch (error) {
        console.log("Error in getting the Subcriptions", error.message);
        return res.status(500).json({ error: error.message });
    }
}


const buySubscription = async(req,res)=>{
    try{
        const {subscriptionPlanID } = req.params;
        // console.log("Hi")
        const clientID = req.user.id;
        // console.log(subscriptionPlanID);
        const subscriptionPlan = await SubscriptionPlan.findById({_id:subscriptionPlanID});
        if(!subscriptionPlan){
            return res.status(404).json({message:'subscription not found'});
        }
        // console.log(subscriptionPlan);

        const client = await Client.findByIdAndUpdate(
            {_id:clientID}, 
            { 
                $set: { 
                    subscriptionId: subscriptionPlanID, 
                    subscriptionDurationInDays: subscriptionPlan.duration, 
                    subscriptionStatus: true 
                } 
            },
            { new: true } // This ensures the updated document is returned
        );

        // console.log("hiepojoiinoi",client)
        return res.status(201).json(client);
    }catch(err){
        console.log("Error in buying subscription",err.message);
        return res.status(500).json({message:"Error in buying subscription"});
    }
}


module.exports = {
    createClient,
    clientLogin,
    getAllClients,
    getAllClientsByID,
    updateProfileClient,
    deleteProfileClient,
    createJob,
    getAllJobs,
    getJobById,
    updateJob,
    deleteJob,
    getGigsByJob,
    finaliseFreelancer,
    getSubscriptionPlansForClients,
    buySubscription
};

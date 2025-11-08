// backend/src/models/plugins/toJSON.js
export default function toJSON(schema) 
{
    // Standardize JSON output: add id, remove _id and __v
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => 
        {
            if (ret._id != null) ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    });

    // Match behavior for toObject (useful in services)
    schema.set('toObject', {
        virtuals: true,
        versionKey: false,
        transform: (_doc, ret) => 
        {
            if (ret._id != null) ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    });
}
